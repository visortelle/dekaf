package consumer.session_runner

import _root_.consumer.coloring_rules.ColoringRuleChain
import _root_.consumer.deserializer.Deserializer
import _root_.consumer.deserializer.deserializers.TreatBytesAsJson
import _root_.consumer.message_filter.MessageFilterChain
import _root_.consumer.pause_trigger.ConsumerSessionPauseTriggerChain
import _root_.consumer.session_config.{ConsumerSessionConfig, MessageDeliveryOrder}
import _root_.consumer.session_target.ConsumerSessionTarget
import _root_.consumer.session_target.consumption_mode.ConsumerSessionTargetConsumptionMode
import _root_.consumer.session_target.consumption_mode.modes.RegularConsumptionMode
import _root_.consumer.session_target.topic_selector.{MultiTopicSelector, TopicSelector}
import _root_.consumer.start_from.EarliestMessage
import _root_.consumer.value_projections.ValueProjectionList
import com.tools.teal.pulsar.ui.api.v1.consumer as consumerPb
import org.apache.pulsar.client.api.{Consumer, Message as PulsarMessage, MessageId as PulsarMessageId, Schema}
import org.apache.pulsar.client.impl.{MessageIdImpl, MessageImpl}
import org.apache.pulsar.common.api.proto.MessageMetadata
import zio.test.*

import java.lang.reflect.{InvocationHandler, Method, Proxy}
import java.nio.ByteBuffer
import java.util.concurrent.atomic.{AtomicBoolean, AtomicLong}
import java.util.concurrent.{CompletableFuture, ConcurrentLinkedQueue, CountDownLatch, TimeUnit}
import scala.jdk.CollectionConverters.*
import scala.util.Try

/** THE BYTE WATERMARK UNDER THE REPLAY BARRIER - the server half of e2e CS-FC-5, made
  * deterministic.
  *
  * The arrangement is CS-FC-5's, scaled to a test JVM: a GUARANTEED session with an unresolved
  * counted cut (ExactCutThenGuaranteed, an unspendable skip budget), one HOT stream delivering fat
  * payloads and one BLIND stream whose recorded range never arrives - so the barrier may not
  * advance, nothing is ever emitted or discarded, and everything the hot stream delivers is HELD.
  * Held bytes walk up to [[startFromMergePauseBytesAt]]'s injected stand-in, and the property
  * under test is the LATCH: the crossing offer must leave the hot consumer paused (the arbiter's
  * Merge reason) before it returns, the overshoot that still arrives is accepted but bounded by
  * what the broker had in flight, and NOTHING that is not the watermark's own drain may lift the
  * hold - not a second Play's User/Boundary release, not the delivery limiter's permit release,
  * not a past-end arrival's nack, and never the give-up (which Guaranteed does not have).
  *
  * These pins were written while hunting CS-FC-5's intermittent unbounded admission (2 of 4 e2e
  * runs let all 400 MiB through a 256 MiB cap). Every reconcile and its desired-set snapshot run
  * under the session's ordering lock, desired can only shrink through dequeues the waiting barrier
  * forbids, and the per-reason arbiter blocks cross-owner releases - each of those claims is
  * pinned here deterministically, including the one real interleaving a latch can force (a second
  * Play racing the crossing's hold). What stays e2e-only is the broker/client boundary: prefetch
  * and reconnect redelivery can inflate what the BROKER dispatched, which no server-side latch
  * decides.
  */
object replayByteWatermarkTest extends ZIOSpecDefault:

    private val consumerName = "cs-byte-watermark-0"
    private def topic(i: Int): String = s"persistent://public/default/cs-byte-watermark-$i"
    private def sid(i: Int): String = startFromStreamId(consumerName, topic(i))

    /** A payload fat enough that the byte cap fires long before any count watermark could: the
      * cap below is FOUR of these, against count watermarks of 1,000 per stream / 10,000 total. */
    private val payloadBytes: Int = 64 * 1024
    private val byteCap: Long = 4L * payloadBytes

    private def worker(name: String)(body: => Unit): Thread =
        val t = new Thread((() => body): Runnable, name)
        t.setDaemon(true)
        t

    private def awaitTrue(condition: => Boolean, boundMs: Long = 30_000L): Boolean =
        val deadline = System.nanoTime() + boundMs * 1_000_000L
        while !condition && System.nanoTime() < deadline do Thread.onSpinWait()
        condition

    /** The blocked-thread barrier the backpressure race suite established: the racing thread's
      * next step is entering a monitor this test holds shut, so BLOCKED is the only state it can
      * reach, it always reaches it, and reaching it proves the interleaving. */
    private def awaitBlocked(t: Thread): Unit =
        val deadline = System.nanoTime() + 30_000_000_000L
        while t.getState != Thread.State.BLOCKED && System.nanoTime() < deadline do Thread.onSpinWait()
        if t.getState != Thread.State.BLOCKED then
            throw new AssertionError(s"the racing thread never queued on the lock; its state is ${t.getState}")

    private final class RecordingConsumer(topicFqn: String):
        val acknowledged = ConcurrentLinkedQueue[String]()
        val handedBack = ConcurrentLinkedQueue[String]()
        val permitCalls = ConcurrentLinkedQueue[String]()
        val isPaused = AtomicBoolean(false)
        /** Armed to hold the caller INSIDE `consumer.pause()` - the crossing's hold mid-flight. */
        @volatile var pauseGate: Option[(CountDownLatch, CountDownLatch)] = None
        @volatile var lastIds: java.util.List[PulsarMessageId] = java.util.Collections.emptyList()

        def recordedEnd(entryId: Long): Unit =
            lastIds = java.util.List.of(new MessageIdImpl(1L, entryId, -1))

        def resumeCalls: Int = permitCalls.asScala.count(_ == "resume")

        val consumer: Consumer[Array[Byte]] =
            val handler = new InvocationHandler:
                override def invoke(proxy: Object, method: Method, args: Array[Object]): Object =
                    method.getName match
                        case "getTopic"          => topicFqn
                        case "getConsumerName"   => consumerName
                        case "isConnected"       => java.lang.Boolean.TRUE
                        case "getLastMessageIds" => lastIds
                        case "pause" =>
                            pauseGate.foreach { (entered, release) =>
                                entered.countDown()
                                release.await(60, TimeUnit.SECONDS)
                                ()
                            }
                            permitCalls.add("pause")
                            isPaused.set(true)
                            null
                        case "resume" =>
                            permitCalls.add("resume")
                            isPaused.set(false)
                            null
                        case "acknowledgeAsync" =>
                            acknowledged.add(args(0).asInstanceOf[PulsarMessage[Array[Byte]]].getKey)
                            CompletableFuture.completedFuture(null)
                        case "negativeAcknowledge" =>
                            handedBack.add(args(0).asInstanceOf[PulsarMessage[Array[Byte]]].getKey)
                            null
                        case "equals"   => java.lang.Boolean.valueOf(proxy eq args(0))
                        case "hashCode" => java.lang.Integer.valueOf(topicFqn.hashCode)
                        case "toString" => s"proxy-consumer($topicFqn)"
                        case _          => null
            Proxy
                .newProxyInstance(getClass.getClassLoader, Array[Class[?]](classOf[Consumer[Array[Byte]]]), handler)
                .asInstanceOf[Consumer[Array[Byte]]]

    private def message(topicFqn: String, key: String, publishTime: Long, entryId: Long): MessageImpl[Array[Byte]] =
        val md = new MessageMetadata()
        md.setPublishTime(publishTime)
        md.setPartitionKey(key)
        val payload = Array.fill[Byte](payloadBytes)('x'.toByte)
        val msg = MessageImpl.create[Array[Byte]](md, ByteBuffer.wrap(payload), Schema.BYTES, topicFqn)
        msg.setMessageId(new MessageIdImpl(1L, entryId, -1))
        msg

    private final class RecordingObserver extends io.grpc.stub.StreamObserver[consumerPb.ResumeResponse]:
        private val frames = ConcurrentLinkedQueue[consumerPb.ResumeResponse]()
        override def onNext(value: consumerPb.ResumeResponse): Unit =
            frames.add(value)
            ()
        override def onError(t: Throwable): Unit = ()
        override def onCompleted(): Unit = ()
        def received: Vector[consumerPb.ResumeResponse] = frames.asScala.toVector
        def deliveredKeys: Vector[String] =
            received.flatMap(_.messages).flatMap(_.key).map(_.stripPrefix("\"").stripSuffix("\""))
        def caughtUpFrames: Vector[consumerPb.ConsumerStats] = received.flatMap(_.consumerStats).filter(_.replayCaughtUp)

    /** CS-FC-5's shape over two proxy streams: an ExactCutThenGuaranteed merge with an unspendable
      * budget, the injected byte cap, and recorded ends far past anything the test delivers - so
      * the hot stream keeps queueing and the blind one keeps the barrier shut. */
    private final class Fixture(sessionName: String, hotEnd: Long = 1_000_000L, budget: Long = 10_000_000L):
        var monoMs: Long = 0L
        val pool: ConsumerSessionContextPool = ConsumerSessionContextPool()
        val listener: ConsumerListener = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = _ => ()))

        val hot = RecordingConsumer(topic(0))
        val blind = RecordingConsumer(topic(1))
        hot.recordedEnd(hotEnd)
        blind.recordedEnd(1_000_000L)

        private val streams = Vector(
            StartFromStream(sid(0), EntryPosition(1L, hotEnd, -1, 1)),
            StartFromStream(sid(1), EntryPosition(1L, 1_000_000L, -1, 1))
        )

        val discard: StartFromDiscard = StartFromDiscard.shared(budget)
        val merge = GlobalSkipMerge[HeldMessage](
            streamIds = Vector(sid(0), sid(1)),
            drainedAtStart = Set.empty,
            discard = discard,
            nowMs = () => monoMs,
            pauseBytesAt = byteCap,
            resumeBytesAt = byteCap / 4,
            payloadBytesOf = held => Try(Option(held.message.getData).map(_.length.toLong).getOrElse(0L)).getOrElse(0L),
            policy = OrderingPolicy.ExactCutThenGuaranteed,
            graceMs = 500L
        )
        listener.startFromOrdering = new StartFromOrdering[HeldMessage](Some(merge), streams.map(s => s.id -> s).toMap)

        private val consumersByTopic: Map[String, Consumer[Array[Byte]]] =
            Map(topic(0) -> hot.consumer, topic(1) -> blind.consumer)
        val pauseArbiters: Map[String, ConsumerPauseArbiter] = consumersByTopic.map((fqn, c) => fqn -> ConsumerPauseArbiter(c))
        listener.pauseArbiters = pauseArbiters.map((fqn, arbiter) => startFromStreamId(consumerName, fqn) -> arbiter)

        val target: ConsumerSessionTargetRunner = ConsumerSessionTargetRunner(
            targetIndex = 0,
            targetConfig = ConsumerSessionTarget(
                isEnabled = true,
                consumptionMode = ConsumerSessionTargetConsumptionMode(mode = RegularConsumptionMode()),
                messageValueDeserializer = Deserializer(deserializer = TreatBytesAsJson()),
                topicSelector = TopicSelector(topicSelector = MultiTopicSelector(topicFqns = consumersByTopic.keys.toVector)),
                messageFilterChain = MessageFilterChain.empty,
                coloringRuleChain = ColoringRuleChain.empty,
                valueProjectionList = ValueProjectionList(isEnabled = false, projections = Vector.empty)
            ),
            nonPartitionedTopicFqns = consumersByTopic.keys.toVector,
            schemasByTopic = Map.empty,
            sessionContextPool = pool,
            consumers = consumersByTopic,
            pauseArbiters = pauseArbiters,
            consumerListener = listener,
            stats = ConsumerSessionTargetStats(messageProcessed = AtomicLong(0))
        )

        val runner: ConsumerSessionRunner = ConsumerSessionRunner(
            sessionName = sessionName,
            sessionConfig = ConsumerSessionConfig(
                startFrom = EarliestMessage(),
                targets = Vector.empty,
                messageFilterChain = MessageFilterChain.empty,
                coloringRuleChain = ColoringRuleChain.empty,
                pauseTriggerChain = ConsumerSessionPauseTriggerChain.empty,
                valueProjectionList = ValueProjectionList(isEnabled = false, projections = Vector.empty),
                messageDeliveryOrder = MessageDeliveryOrder.Guaranteed
            ),
            sessionContextPool = pool,
            grpcResponseObserver = None,
            schemasByTopic = Map.empty,
            targets = Map(0 -> target)
        )

        def hotArbiter: ConsumerPauseArbiter = pauseArbiters(topic(0))

        def deliverHot(n: Int, fromEntry: Long = 0L): Unit =
            (0 until n).foreach { i =>
                val entryId = fromEntry + i
                listener.received(hot.consumer, message(topic(0), s"a-$entryId", 100L + entryId, entryId))
            }

        def close(): Unit =
            Try(runner.stop())
            ()

    def spec = suite(this.getClass.toString)(
        test("THE BYTE CAP LATCHES ADMISSION SYNCHRONOUSLY: the crossing offer leaves the hot consumer paused before it returns") {
            // Counts are unreachable (a handful of messages against 1,000 / 10,000 watermarks),
            // so if anything pauses the stream it is the byte cap - CS-FC-5's discriminator. The
            // hold must be applied INSIDE the crossing delivery (offer, mark, reconcile and the
            // arbiter's Merge hold all run under the ordering lock before `received` returns),
            // and later arrivals - the prefetch the pause cannot un-ask - are accepted and held
            // without the hold moving.
            // Every observation is SNAPSHOT before the assertion: assertTrue's smart diagnostics
            // re-evaluate the expression tree after the finally, and close() legitimately holds
            // the User reason on every arbiter on its way out.
            val f = Fixture("cs-byte-latch")
            try
                f.listener.startAcceptingNewMessages()
                f.deliverHot(3)
                val pausedBeforeCap = f.hot.isPaused.get
                f.deliverHot(1, fromEntry = 3L) // held bytes reach the cap exactly here
                val pausedAtCrossing = f.hot.isPaused.get
                val reasonsAtCrossing = f.hotArbiter.heldReasons
                f.deliverHot(3, fromEntry = 4L) // the in-flight overshoot: accepted, still held
                val pausedAfterOvershoot = f.hot.isPaused.get
                val blindPaused = f.blind.isPaused.get
                val held = (f.merge.heldCount, f.merge.heldBytesCount)
                val remaining = f.discard.remaining
                val decided = (f.hot.acknowledged.asScala.toVector, f.hot.handedBack.asScala.toVector)
                assertTrue(
                    !pausedBeforeCap,
                    pausedAtCrossing, // the latch is synchronous with the crossing
                    reasonsAtCrossing.contains(PauseReason.Merge),
                    pausedAfterOvershoot,
                    held == (7, 7L * payloadBytes), // overshoot accepted - a watermark, not a wall
                    !blindPaused, // the stream that can unblock the barrier always runs
                    remaining == 10_000_000L, // nothing was claimed by the cut
                    decided == (Vector.empty, Vector.empty) // held, not decided
                ) ?? (s"pausedBefore=$pausedBeforeCap pausedAt=$pausedAtCrossing reasons=$reasonsAtCrossing " +
                    s"held=$held remaining=$remaining blindPaused=$blindPaused decided=$decided")
            finally f.close()
        },
        test("NO GIVE-UP UNDER GUARANTEED: the blind stream outlives the best-effort window with the hold intact and the stall disclosed") {
            // The deterministic version of CS-FC-5's 40-second fixpoint: hand the merge clock a
            // whole give-up window and sweep. Guaranteed never abandons a stream, so nothing may
            // drain, the hold may not lift, and no caught-up may be announced - the one thing the
            // session says is the stall disclosure.
            val f = Fixture("cs-byte-no-give-up")
            try
                f.listener.startAcceptingNewMessages()
                f.deliverHot(4)
                f.monoMs += startFromMergeStallWindowMs + 1_000L
                f.listener.sweepStartFromStall()
                f.listener.sweepStartFromStall()
                val abandoned = f.listener.startFromOrdering.abandonedStreams
                val warnings = f.listener.startFromOrdering.stallWarningCount
                val pausedAfterWindow = f.hot.isPaused.get
                val reasons = f.hotArbiter.heldReasons
                val held = f.merge.heldCount
                val remaining = f.discard.remaining
                val acked = f.hot.acknowledged.asScala.toVector
                assertTrue(
                    abandoned.isEmpty,
                    warnings >= 1L, // disclosed, not silent
                    pausedAfterWindow,
                    reasons.contains(PauseReason.Merge),
                    held == 4,
                    remaining == 10_000_000L,
                    acked.isEmpty
                ) ?? s"abandoned=$abandoned warnings=$warnings paused=$pausedAfterWindow reasons=$reasons held=$held"
            finally f.close()
        },
        test("A SECOND PLAY IS NOT AN OWNER: releasing User and Boundary leaves the Merge hold standing") {
            // The resume walk releases exactly the reasons it owns. With the byte cap's Merge
            // hold standing, a second Play - generation bump, boundary re-capture, User and
            // Boundary releases, gate re-open - must leave the hot consumer paused and the held
            // set untouched.
            val f = Fixture("cs-byte-second-play")
            try
                f.runner.resume(RecordingObserver(), isDebug = false)
                f.deliverHot(4)
                val resumesBeforeSecondPlay = f.hot.resumeCalls
                f.runner.resume(RecordingObserver(), isDebug = false)
                val pausedAfterSecondPlay = f.hot.isPaused.get
                val reasons = f.hotArbiter.heldReasons
                val resumesAfterSecondPlay = f.hot.resumeCalls
                val held = f.merge.heldCount
                val remaining = f.discard.remaining
                assertTrue(
                    pausedAfterSecondPlay,
                    reasons.contains(PauseReason.Merge),
                    // The walk released User/Boundary it never held; with Merge standing the
                    // arbiter must not have resumed the consumer even once more.
                    resumesAfterSecondPlay == resumesBeforeSecondPlay,
                    held == 4,
                    remaining == 10_000_000L
                ) ?? (s"paused=$pausedAfterSecondPlay reasons=$reasons " +
                    s"resumes=$resumesAfterSecondPlay (before=$resumesBeforeSecondPlay) held=$held")
            finally f.close()
        },
        test("THE LIMITER'S PERMIT RELEASE IS NOT AN OWNER: holding and releasing the Limiter reason leaves the Merge hold standing") {
            // The delivery pacer's hooks land on the arbiter's Limiter reason - a full
            // hold-then-release cycle, and the bare release its refusal rollback performs, must
            // both leave a Merge-held consumer exactly where it was.
            val f = Fixture("cs-byte-limiter-release")
            try
                f.listener.startAcceptingNewMessages()
                f.deliverHot(4)
                f.target.setPermitHold(true)
                val heldDuringLimiter = f.hotArbiter.heldReasons
                f.target.setPermitHold(false) // the ordinary release
                val afterCycle = f.hotArbiter.heldReasons
                f.target.setPermitHold(false) // the rollback's bare release, nothing held
                val afterBareRelease = f.hotArbiter.heldReasons
                val pausedAtEnd = f.hot.isPaused.get
                val held = f.merge.heldCount
                assertTrue(
                    heldDuringLimiter == Set(PauseReason.Merge, PauseReason.Limiter),
                    afterCycle == Set(PauseReason.Merge),
                    pausedAtEnd,
                    afterBareRelease == Set(PauseReason.Merge),
                    held == 4
                ) ?? (s"during=$heldDuringLimiter afterCycle=$afterCycle " +
                    s"afterBare=$afterBareRelease paused=$pausedAtEnd held=$held")
            finally f.close()
        },
        test("A PAST-END ARRIVAL'S NACK RELEASES NOTHING AND BYPASSES NO ACCOUNTING") {
            // The hot stream's recorded end is small here, so a later entry is a NEXT-CHUNK
            // arrival mid-hold: it is handed back and its consumer gains the Boundary reason -
            // and that decision must neither lift the Merge hold, nor touch the held set, nor
            // spend budget, nor acknowledge anything.
            val f = Fixture("cs-byte-past-end", hotEnd = 10L)
            try
                f.listener.startAcceptingNewMessages()
                f.deliverHot(4)
                val heldBefore = (f.merge.heldCount, f.merge.heldBytesCount)
                f.deliverHot(1, fromEntry = 11L) // strictly past entry 10: next chunk's business
                val handedBack = f.hot.handedBack.asScala.toVector
                val reasons = f.hotArbiter.heldReasons
                val pausedAfterNack = f.hot.isPaused.get
                val heldAfter = (f.merge.heldCount, f.merge.heldBytesCount)
                val remaining = f.discard.remaining
                val acked = f.hot.acknowledged.asScala.toVector
                val caughtUp = f.runner.isReplayCaughtUpNow
                assertTrue(
                    handedBack == Vector("a-11"),
                    reasons == Set(PauseReason.Merge, PauseReason.Boundary),
                    pausedAfterNack,
                    heldAfter == heldBefore, // no accounting bypass
                    remaining == 10_000_000L,
                    acked.isEmpty,
                    !caughtUp // the blind stream still gates the chunk
                ) ?? s"handedBack=$handedBack reasons=$reasons held=$heldAfter before=$heldBefore caughtUp=$caughtUp"
            finally f.close()
        },
        test("LATCH-PINNED: a second Play racing the crossing's hold queues behind the ordering lock and cannot unlatch it") {
            // The one interleaving a latch can force in this neighborhood: the byte crossing is
            // MID-HOLD - blocked inside consumer.pause() with the ordering lock, the flow-control
            // lock and the arbiter's monitor all held - when a second Play arrives. The play's
            // boundary re-capture must queue on the ordering lock (BLOCKED is the only state its
            // thread can reach), and once the hold completes, the play's User/Boundary releases
            // run against a reason set that contains Merge - so the consumer stays paused and the
            // held set stays intact. A regression that moved the hold outside the crossing's lock,
            // or released it from the resume walk, fails this deterministically.
            val f = Fixture("cs-byte-race-second-play")
            try
                f.runner.resume(RecordingObserver(), isDebug = false)
                f.deliverHot(3)
                val entered = CountDownLatch(1)
                val release = CountDownLatch(1)
                f.hot.pauseGate = Some((entered, release))

                val crossing = worker("byte-crossing") {
                    f.deliverHot(1, fromEntry = 3L)
                }
                crossing.start()
                val holdInFlight = entered.await(30, TimeUnit.SECONDS)
                f.hot.pauseGate = None

                val racing = worker("second-play") {
                    f.runner.resume(RecordingObserver(), isDebug = false)
                }
                racing.start()
                awaitBlocked(racing) // queued on the ordering lock the crossing still holds

                val resumesBeforeRelease = f.hot.resumeCalls
                release.countDown()
                crossing.join(30_000)
                racing.join(30_000)

                val pausedAfterBoth = f.hot.isPaused.get
                val reasons = f.hotArbiter.heldReasons
                val resumesAfterBoth = f.hot.resumeCalls
                val held = f.merge.heldCount
                val remaining = f.discard.remaining
                assertTrue(
                    holdInFlight,
                    pausedAfterBoth,
                    reasons.contains(PauseReason.Merge),
                    resumesAfterBoth == resumesBeforeRelease, // the play lifted nothing it did not own
                    held == 4,
                    remaining == 10_000_000L
                ) ?? (s"holdInFlight=$holdInFlight paused=$pausedAfterBoth " +
                    s"reasons=$reasons resumes=$resumesAfterBoth held=$held")
            finally f.close()
        }
    ) @@ TestAspect.sequential
