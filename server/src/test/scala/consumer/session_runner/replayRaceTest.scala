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
import java.util.concurrent.atomic.AtomicLong
import java.util.concurrent.{CompletableFuture, ConcurrentLinkedQueue, CountDownLatch, TimeUnit}
import scala.jdk.CollectionConverters.*
import scala.util.Try

/** THE REPLAY BOUNDARY'S LIFECYCLE RACES, pinned with latches - the exact neighborhood where this
  * branch's worst bugs lived, given the same confirm-first discipline.
  *
  *   - A RESUME RACING THE AUTO-PAUSE: the caught-up announcement runs under the ordering lock
  *     with a play-generation gate, and a Resume bumps the generation BEFORE its boundary
  *     extension takes that same lock - so a stale announcement can never pause the play the
  *     user just started, and the new play completes the chunk and announces itself.
  *   - A PAST-END NACK RACING THE BOUNDARY RE-CAPTURE: the next-chunk decision (nack + consumer
  *     hold) and the extension serialize on the ordering lock, so the handed-back message is
  *     released by the very resume that extended past it and is delivered exactly once.
  *   - THE RELAX RPC ARRIVING WHILE CAUGHT-UP-PAUSED (decided and pinned): it SUCCEEDS - the
  *     session becomes a normal Best-effort session that resumes live delivery - unless the
  *     user's own pause is also standing, which then keeps standing.
  *
  * Offline: proxy consumers, hand-built messages, the production listener / ordering layer /
  * runner / pump. Interleavings are pinned by latches and a generation spin-wait on a monotonic
  * counter - never by a sleep.
  */
object replayRaceTest extends ZIOSpecDefault:

    private val consumerName = "cs-replay-race-0"
    private def topic(i: Int): String = s"persistent://public/default/cs-replay-race-$i"
    private def sid(i: Int): String = startFromStreamId(consumerName, topic(i))

    private def worker(name: String)(body: => Unit): Thread =
        val t = new Thread((() => body): Runnable, name)
        t.setDaemon(true)
        t

    /** Wait for a monotonic condition that another thread is guaranteed to make true - a latch
      * over state rather than a sleep. Answers whether it happened inside the bound. */
    private def awaitTrue(condition: => Boolean, boundMs: Long = 30_000L): Boolean =
        val deadline = System.nanoTime() + boundMs * 1_000_000L
        while !condition && System.nanoTime() < deadline do Thread.onSpinWait()
        condition

    private final class RecordingConsumer(topicFqn: String):
        val acknowledged = ConcurrentLinkedQueue[String]()
        val handedBack = ConcurrentLinkedQueue[String]()
        @volatile var lastIds: java.util.List[PulsarMessageId] = java.util.Collections.emptyList()
        /** Armed by a test to hold the ordering lock INSIDE a negative acknowledgment. */
        @volatile var nackGate: Option[(CountDownLatch, CountDownLatch)] = None

        def recordedEnd(entryId: Long): Unit =
            lastIds = java.util.List.of(new MessageIdImpl(1L, entryId, -1))

        val consumer: Consumer[Array[Byte]] =
            val handler = new InvocationHandler:
                override def invoke(proxy: Object, method: Method, args: Array[Object]): Object =
                    method.getName match
                        case "getTopic"          => topicFqn
                        case "getConsumerName"   => consumerName
                        case "isConnected"       => java.lang.Boolean.TRUE
                        case "getLastMessageIds" => lastIds
                        case "acknowledgeAsync" =>
                            acknowledged.add(args(0).asInstanceOf[PulsarMessage[Array[Byte]]].getKey)
                            CompletableFuture.completedFuture(null)
                        case "negativeAcknowledge" =>
                            nackGate.foreach { (entered, release) =>
                                entered.countDown()
                                release.await(60, TimeUnit.SECONDS)
                                ()
                            }
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
        val msg = MessageImpl.create[Array[Byte]](md, ByteBuffer.wrap(s"""{"k":"$key"}""".getBytes("UTF-8")), Schema.BYTES, topicFqn)
        msg.setMessageId(new MessageIdImpl(1L, entryId, -1))
        msg

    /** Records frames; can be armed to BLOCK inside the write of a message-bearing frame - the
      * shape of a delivery in flight across a lifecycle event, holding the send and ordering
      * locks exactly as production does. */
    private final class GatedObserver(blockFirstMessageFrame: Boolean = false) extends io.grpc.stub.StreamObserver[consumerPb.ResumeResponse]:
        private val frames = ConcurrentLinkedQueue[consumerPb.ResumeResponse]()
        val entered = CountDownLatch(1)
        val release = CountDownLatch(1)
        private val armed = java.util.concurrent.atomic.AtomicBoolean(blockFirstMessageFrame)
        override def onNext(value: consumerPb.ResumeResponse): Unit =
            if value.messages.exists(_.key.isDefined) && armed.compareAndSet(true, false) then
                entered.countDown()
                release.await(60, TimeUnit.SECONDS)
                ()
            frames.add(value)
            ()
        override def onError(t: Throwable): Unit = ()
        override def onCompleted(): Unit = ()
        def received: Vector[consumerPb.ResumeResponse] = frames.asScala.toVector
        def deliveredKeys: Vector[String] =
            received.flatMap(_.messages).flatMap(_.key).map(_.stripPrefix("\"").stripSuffix("\""))
        def caughtUpFrames: Vector[consumerPb.ConsumerStats] = received.flatMap(_.consumerStats).filter(_.replayCaughtUp)

    private final class Fixture(sessionName: String, topicCount: Int, endsAtPlay: Map[Int, Long]):
        var monoMs: Long = 0L
        val pool: ConsumerSessionContextPool = ConsumerSessionContextPool()
        val listener: ConsumerListener = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = _ => ()))
        val consumers: Vector[RecordingConsumer] = Vector.tabulate(topicCount)(i => RecordingConsumer(topic(i)))
        endsAtPlay.foreach((i, entryId) => if entryId >= 0 then consumers(i).recordedEnd(entryId))

        private def streamsAtPlay: Vector[StartFromStream] =
            Vector.tabulate(topicCount) { i =>
                val end = endsAtPlay.get(i).filter(_ >= 0).map(e => EntryPosition(1L, e, -1, 1)).getOrElse(EntryPosition.empty)
                StartFromStream(sid(i), end)
            }

        val merge = GlobalSkipMerge[HeldMessage](
            streamIds = Vector.tabulate(topicCount)(sid),
            drainedAtStart = streamsAtPlay.filter(_.lastAtStart == EntryPosition.empty).map(_.id).toSet,
            discard = StartFromDiscard.shared(0),
            nowMs = () => monoMs,
            policy = OrderingPolicy.GuaranteedOnly,
            graceMs = 500L
        )
        listener.startFromOrdering = new StartFromOrdering[HeldMessage](Some(merge), streamsAtPlay.map(s => s.id -> s).toMap)

        private val consumersByTopic: Map[String, Consumer[Array[Byte]]] =
            Vector.tabulate(topicCount)(i => topic(i) -> consumers(i).consumer).toMap
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

        def deliver(partition: Int, key: String, publishTime: Long, entryId: Long): Unit =
            listener.received(consumers(partition).consumer, message(topic(partition), key, publishTime, entryId))

        def acknowledged: Vector[String] = consumers.flatMap(_.acknowledged.asScala.toVector)
        def handedBack: Vector[String] = consumers.flatMap(_.handedBack.asScala.toVector)
        def boundaryHeld: Boolean = pauseArbiters.values.exists(_.heldReasons.contains(PauseReason.Boundary))
        def close(): Unit =
            Try(runner.stop())
            ()

    private val awaitMs = 60_000L

    def spec = suite(this.getClass.toString)(
        test("A RESUME RACING THE AUTO-PAUSE: the stale announcement is suppressed by the generation gate, and the new play announces") {
            // The last replay message is IN FLIGHT - blocked inside the client write, holding the
            // ordering and send locks - when the user presses Play again. The resume bumps the
            // play generation first (it blocks on the send lock right after), so when the
            // delivery completes and the barrier reports caught-up, the OLD play's announcement
            // must see the foreign generation and do NOTHING: no pause of the play the user just
            // started, no caught-up frame into the replaced stream. The new play's own resume
            // pump then finds the chunk complete and announces it properly.
            val f = Fixture("cs-race-resume-vs-autopause", topicCount = 2, endsAtPlay = Map(0 -> 0L, 1 -> -1L))
            try
                val first = GatedObserver(blockFirstMessageFrame = true)
                f.runner.resume(first, isDebug = false)

                val delivering = worker("pulsar-listener-race-a") {
                    f.deliver(0, "m-100", 100L, 0L) // the whole recorded range; its send blocks
                }
                delivering.start()
                val sendInFlight = first.entered.await(30, TimeUnit.SECONDS)

                val second = GatedObserver()
                val resuming = worker("grpc-resume-race-a") {
                    f.runner.resume(second, isDebug = false)
                }
                resuming.start()
                // The generation bump is the resume's FIRST act, before it blocks on the send
                // lock the in-flight delivery holds - the exact window the gate exists for.
                val generationBumped = awaitTrue(f.runner.currentPlayGeneration == 2L)

                first.release.countDown()
                delivering.join(awaitMs)
                resuming.join(awaitMs)

                assertTrue(
                    sendInFlight,
                    generationBumped,
                    first.deliveredKeys == Vector("m-100"), // the in-flight delivery completed, once
                    first.caughtUpFrames.isEmpty, // THE GATE: the stale announcement wrote nothing
                    second.caughtUpFrames.nonEmpty, // the new play completed the chunk and said so
                    second.deliveredKeys.isEmpty, // and re-delivered nothing
                    f.acknowledged == Vector("m-100"),
                    !f.listener.isAcceptingNewMessages, // auto-paused under the NEW play
                    f.boundaryHeld,
                    f.runner.isReplayCaughtUpNow
                ) ?? (s"first=${first.deliveredKeys}/${first.caughtUpFrames.size} " +
                    s"second=${second.deliveredKeys}/${second.caughtUpFrames.size} acked=${f.acknowledged} " +
                    s"gateOpen=${f.listener.isAcceptingNewMessages} boundaryHeld=${f.boundaryHeld}")
            finally f.close()
        },
        test("A PAST-END NACK RACING THE RE-CAPTURE: the extension waits for the decision, the resume releases it, the message lands once") {
            // A past-boundary arrival is mid-decision - its consumer hold is placed and its
            // negative acknowledgment is blocked, holding the ordering lock - while a Resume
            // re-captures the (already grown) ends. The extension MUST queue behind the decision
            // on the ordering lock; the resume that follows releases the Boundary hold it just
            // obsoleted, and the broker's redelivery of the handed-back message arrives inside
            // the new chunk: delivered exactly once, never lost, never doubled.
            val f = Fixture("cs-race-nack-vs-extend", topicCount = 2, endsAtPlay = Map(0 -> 0L, 1 -> 0L))
            try
                val first = GatedObserver()
                f.runner.resume(first, isDebug = false)
                f.deliver(1, "b-200", 200L, 0L) // stream 1's recorded end, held for stream 0
                f.consumers(1).recordedEnd(1L) // the log grows: entry 1 exists now
                val entered = CountDownLatch(1)
                val release = CountDownLatch(1)
                f.consumers(1).nackGate = Some((entered, release))

                val nacking = worker("pulsar-listener-race-b") {
                    f.deliver(1, "b-400", 400L, 1L) // past the CURRENT boundary: next chunk
                }
                nacking.start()
                val decisionInFlight = entered.await(30, TimeUnit.SECONDS)
                val boundaryHeldMidDecision = f.pauseArbiters(topic(1)).heldReasons.contains(PauseReason.Boundary)

                val second = GatedObserver()
                val resuming = worker("grpc-resume-race-b") {
                    f.runner.resume(second, isDebug = false) // re-captures ends; extension queues on the lock
                }
                resuming.start()
                val generationBumped = awaitTrue(f.runner.currentPlayGeneration == 2L)

                f.consumers(1).nackGate = None
                release.countDown()
                nacking.join(awaitMs)
                resuming.join(awaitMs)

                val boundaryReleasedByResume = !f.boundaryHeld
                f.deliver(1, "b-400", 400L, 1L) // the broker redelivers what was handed back
                f.deliver(0, "a-100", 100L, 0L) // stream 0's recorded range arrives too

                assertTrue(
                    decisionInFlight,
                    generationBumped,
                    boundaryHeldMidDecision, // the racer was paused before it was handed back
                    boundaryReleasedByResume, // and the resume lifted exactly that hold
                    f.handedBack.count(_ == "b-400") == 1, // one nack, not a loop
                    second.deliveredKeys == Vector("a-100", "b-200", "b-400"), // the chunk, exactly, in key order
                    second.deliveredKeys.count(_ == "b-400") == 1, // the seam message landed ONCE
                    f.acknowledged.sorted == Vector("a-100", "b-200", "b-400"),
                    second.caughtUpFrames.nonEmpty // and the extended chunk completed
                ) ?? (s"handedBack=${f.handedBack} delivered=${second.deliveredKeys} " +
                    s"acked=${f.acknowledged} boundaryHeldMid=$boundaryHeldMidDecision")
            finally f.close()
        },
        test("THE RELAX RPC WHILE CAUGHT-UP-PAUSED SUCCEEDS: the session becomes a live Best-effort session") {
            // Decided and pinned (the brief's open question): SetDeliveryOrder's relax on a
            // caught-up-paused session is the designed "continue live with Best effort"
            // transition. It succeeds, the caught-up state clears, the Boundary holds lift, the
            // intake re-opens, and new traffic flows under the best-effort rules.
            val f = Fixture("cs-race-relax-caught-up", topicCount = 2, endsAtPlay = Map(0 -> 0L, 1 -> 0L))
            try
                val observer = GatedObserver()
                f.runner.resume(observer, isDebug = false)
                f.deliver(0, "a-100", 100L, 0L)
                f.deliver(1, "b-200", 200L, 0L)
                val caughtUpBeforeRelax = f.runner.isReplayCaughtUpNow && !f.listener.isAcceptingNewMessages && f.boundaryHeld

                f.runner.setDeliveryOrder(MessageDeliveryOrder.BestEffort)

                val liveAgain = f.listener.isAcceptingNewMessages && !f.boundaryHeld && !f.runner.isReplayCaughtUpNow
                // New traffic - past the old boundary - is ordinary best-effort delivery now:
                // held for its own residence, released by the sweep, delivered through the
                // limiter's drain.
                f.deliver(1, "b-400", 400L, 1L)
                val acceptedByTheMerge = f.merge.heldCount == 1
                f.monoMs += 501L
                f.listener.sweepStartFromStall()
                val delivered = awaitTrue(observer.deliveredKeys.contains("b-400"))

                assertTrue(
                    caughtUpBeforeRelax,
                    f.runner.deliveryOrder == MessageDeliveryOrder.BestEffort,
                    !f.listener.startFromOrdering.isGuaranteedOrdering,
                    f.listener.startFromOrdering.isContinuousOrdering,
                    liveAgain,
                    acceptedByTheMerge, // no next-chunk interception under best effort
                    delivered,
                    f.handedBack.isEmpty, // nothing was refused on the way
                    observer.deliveredKeys == Vector("a-100", "b-200", "b-400")
                ) ?? (s"caughtUpBefore=$caughtUpBeforeRelax liveAgain=$liveAgain " +
                    s"delivered=${observer.deliveredKeys} handedBack=${f.handedBack}")
            finally f.close()
        },
        test("THE RELAX NEVER OVERRIDES THE USER'S OWN PAUSE: their pause stands, only the boundary state dissolves") {
            // The user paused a caught-up session on top of its auto-pause, then relaxed the
            // order. The Boundary holds lift and the caught-up state clears - but the gate stays
            // shut and the User hold stands: relaxing a session must never un-pause one the user
            // explicitly stopped. Their next Resume goes live under Best effort.
            val f = Fixture("cs-race-relax-user-paused", topicCount = 2, endsAtPlay = Map(0 -> 0L, 1 -> 0L))
            try
                val observer = GatedObserver()
                f.runner.resume(observer, isDebug = false)
                f.deliver(0, "a-100", 100L, 0L)
                f.deliver(1, "b-200", 200L, 0L)
                f.runner.pause() // the user's own pause, on top of the auto-pause

                f.runner.setDeliveryOrder(MessageDeliveryOrder.BestEffort)

                val stillPausedForTheUser = !f.listener.isAcceptingNewMessages
                val userHoldStands = f.pauseArbiters.values.forall(_.heldReasons.contains(PauseReason.User))
                val boundaryDissolved = !f.boundaryHeld && !f.runner.isReplayCaughtUpNow

                val second = GatedObserver()
                f.runner.resume(second, isDebug = false) // and the user's resume goes live
                f.deliver(1, "b-400", 400L, 1L)
                f.monoMs += 501L
                f.listener.sweepStartFromStall()
                val delivered = awaitTrue(second.deliveredKeys.contains("b-400"))

                assertTrue(
                    stillPausedForTheUser,
                    userHoldStands,
                    boundaryDissolved,
                    f.runner.deliveryOrder == MessageDeliveryOrder.BestEffort,
                    delivered
                ) ?? (s"pausedForUser=$stillPausedForTheUser userHold=$userHoldStands " +
                    s"boundaryDissolved=$boundaryDissolved delivered=${second.deliveredKeys}")
            finally f.close()
        }
    ) @@ TestAspect.sequential
