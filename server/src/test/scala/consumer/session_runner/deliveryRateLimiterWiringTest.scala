package consumer.session_runner

import _root_.consumer.coloring_rules.ColoringRuleChain
import _root_.consumer.deserializer.Deserializer
import _root_.consumer.deserializer.deserializers.UseLatestTopicSchema
import _root_.consumer.message_filter.MessageFilterChain
import _root_.consumer.pause_trigger.ConsumerSessionPauseTriggerChain
import _root_.consumer.session_config.ConsumerSessionConfig
import _root_.consumer.session_target.ConsumerSessionTarget
import _root_.consumer.session_target.consumption_mode.ConsumerSessionTargetConsumptionMode
import _root_.consumer.session_target.consumption_mode.modes.RegularConsumptionMode
import _root_.consumer.session_target.topic_selector.{MultiTopicSelector, TopicSelector}
import _root_.consumer.start_from.EarliestMessage
import _root_.consumer.value_projections.ValueProjectionList
import org.apache.pulsar.client.api.{Consumer, Message as PulsarMessage, Schema}
import org.apache.pulsar.client.impl.{MessageIdImpl, MessageImpl}
import org.apache.pulsar.common.api.proto.MessageMetadata
import zio.test.*

import java.lang.reflect.{InvocationHandler, Method, Proxy}
import java.nio.ByteBuffer
import java.util.concurrent.atomic.AtomicLong
import java.util.concurrent.{CompletableFuture, ConcurrentLinkedQueue}
import scala.collection.mutable.ArrayBuffer
import scala.jdk.CollectionConverters.*

/** The rate limiter wired into the REAL delivery path: `ConsumerListener.received` with proxy
  * consumers, a hand-cranked drain, and a real runner for the permit arbitration. Only the broker
  * is replaced.
  *
  * What must hold end to end, not just inside the limiter: a limited Deliver reaches nobody until
  * the drain and is ACKNOWLEDGED at delivery, not at receipt; DROPS ignore the limit entirely, so
  * a counted skip positions at full speed; a delivery that fails at the observer is handed back
  * exactly as the unlimited path would; the user's pause outranks the limiter's permit hold; and a
  * hold is refused while start-from counting is still resolving.
  */
object deliveryRateLimiterWiringTest extends ZIOSpecDefault:

    private val consumerName = "cs-rate-limit-wiring"
    private val p0 = "persistent://public/default/rate-limit-wiring-0"

    /** A consumer recording acks, nacks AND permit calls - the last two are this suite's subject. */
    private final class RecordingConsumer(topicFqn: String):
        val acknowledged = ConcurrentLinkedQueue[String]()
        val handedBack = ConcurrentLinkedQueue[String]()
        val permitCalls = ConcurrentLinkedQueue[String]()

        val consumer: Consumer[Array[Byte]] =
            val handler = new InvocationHandler:
                override def invoke(proxy: Object, method: Method, args: Array[Object]): Object =
                    method.getName match
                        case "getTopic"        => topicFqn
                        case "getConsumerName" => consumerName
                        case "isConnected"     => java.lang.Boolean.TRUE
                        case "pause"           => permitCalls.add("pause"); null
                        case "resume"          => permitCalls.add("resume"); null
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

    private def message(key: String, entryId: Long): MessageImpl[Array[Byte]] = messageOn(p0, key, 1000L + entryId, entryId)

    private def messageOn(topicFqn: String, key: String, publishTime: Long, entryId: Long): MessageImpl[Array[Byte]] =
        val md = new MessageMetadata()
        md.setPublishTime(publishTime)
        md.setPartitionKey(key)
        val msg = MessageImpl.create[Array[Byte]](md, ByteBuffer.wrap(s"""{"k":"$key"}""".getBytes("UTF-8")), Schema.BYTES, topicFqn)
        msg.setMessageId(new MessageIdImpl(1L, entryId, -1))
        msg

    /** A listener recording deliveries, with an optional per-key throw to play the cancelled
      * client. Gate OPEN, pass-through ordering - the plain live-tail shape. */
    private def listener(delivered: ConcurrentLinkedQueue[String], throwOn: Set[String] = Set.empty): ConsumerListener =
        val l = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = msg =>
            if throwOn.contains(msg.getKey) then throw io.grpc.StatusRuntimeException(io.grpc.Status.CANCELLED)
            delivered.add(msg.getKey)
            ()
        ))
        l.startAcceptingNewMessages()
        l

    /** A limiter with a hand-cranked timer, wired the way the runner wires it. */
    private final class ManualWiring(rate: Long, holdPermits: () => Boolean = () => true, releasePermits: () => Boolean = () => true):
        private val pending = ArrayBuffer[Runnable]()
        val core = DeliveryRateLimiterCore[HeldMessage](nowMs = () => 0L)
        val limiter = DeliveryRateLimiter[HeldMessage](
            core = core,
            schedule = (_, task) => { pending += task; () },
            process = held => held.listener.deliverNow(held),
            holdPermits = holdPermits,
            releasePermits = releasePermits
        )
        core.setRate(rate)

        def drain(): Unit =
            val tasks = pending.toVector
            pending.clear()
            tasks.foreach(_.run())

    private def targetRunner(consumerListener: ConsumerListener, consumers: Map[String, Consumer[Array[Byte]]]): ConsumerSessionTargetRunner =
        ConsumerSessionTargetRunner(
            targetIndex = 0,
            targetConfig = ConsumerSessionTarget(
                isEnabled = true,
                consumptionMode = ConsumerSessionTargetConsumptionMode(mode = RegularConsumptionMode()),
                messageValueDeserializer = Deserializer(deserializer = UseLatestTopicSchema()),
                topicSelector = TopicSelector(topicSelector = MultiTopicSelector(topicFqns = Vector(p0))),
                messageFilterChain = MessageFilterChain.empty,
                coloringRuleChain = ColoringRuleChain.empty,
                valueProjectionList = ValueProjectionList(isEnabled = false, projections = Vector.empty)
            ),
            nonPartitionedTopicFqns = Vector(p0),
            schemasByTopic = Map.empty,
            sessionContextPool = ConsumerSessionContextPool(),
            consumers = consumers,
            pauseArbiters = (consumers).map((fqn, c) => fqn -> ConsumerPauseArbiter(c)),
            consumerListener = consumerListener,
            stats = ConsumerSessionTargetStats(messageProcessed = AtomicLong(0))
        )

    private def session(target: ConsumerSessionTargetRunner): ConsumerSessionRunner =
        ConsumerSessionRunner(
            sessionName = "cs-rate-limit-wiring",
            sessionConfig = ConsumerSessionConfig(
                startFrom = EarliestMessage(),
                targets = Vector.empty,
                messageFilterChain = MessageFilterChain.empty,
                coloringRuleChain = ColoringRuleChain.empty,
                pauseTriggerChain = ConsumerSessionPauseTriggerChain.empty,
                valueProjectionList = ValueProjectionList(isEnabled = false, projections = Vector.empty)
            ),
            sessionContextPool = ConsumerSessionContextPool(),
            grpcResponseObserver = None,
            schemasByTopic = Map.empty,
            targets = Map(0 -> target)
        )

    def spec = suite("delivery rate limiter wired into the delivery path")(
        test("a limited Deliver reaches nobody until the drain, then arrives in order, ACKED AT DELIVERY") {
            val delivered = ConcurrentLinkedQueue[String]()
            val recording = RecordingConsumer(p0)
            val l = listener(delivered)
            val wiring = ManualWiring(rate = 100)
            l.deliveryRateLimiter = Some(wiring.limiter)

            (1 to 3).foreach(i => l.received(recording.consumer, message(s"m$i", i.toLong)))
            val deliveredBeforeDrain = delivered.asScala.toVector
            val ackedBeforeDrain = recording.acknowledged.asScala.toVector
            wiring.drain()

            // Nothing moved before the drain - not the handler, and NOT the acks: a message
            // acknowledged at receipt would be lost to a session that stopped before its delivery.
            assertTrue(deliveredBeforeDrain.isEmpty) &&
            assertTrue(ackedBeforeDrain.isEmpty) &&
            assertTrue(delivered.asScala.toVector == Vector("m1", "m2", "m3")) &&
            assertTrue(recording.acknowledged.asScala.toVector == Vector("m1", "m2", "m3"))
        },
        test("DROPS ignore the limit: a counted skip positions at full speed under any rate") {
            val delivered = ConcurrentLinkedQueue[String]()
            val recording = RecordingConsumer(p0)
            val l = listener(delivered)
            l.startFromDiscard = StartFromDiscard.shared(2)
            val wiring = ManualWiring(rate = 1) // absurdly tight, to prove drops never touch it
            l.deliveryRateLimiter = Some(wiring.limiter)

            (1 to 3).foreach(i => l.received(recording.consumer, message(s"m$i", i.toLong)))

            // The two drops were acknowledged IMMEDIATELY, with no drain ever run; only the third
            // message - the first the user will see - sits waiting for the limiter.
            assertTrue(recording.acknowledged.asScala.toVector == Vector("m1", "m2")) &&
            assertTrue(delivered.asScala.isEmpty) &&
            assertTrue(wiring.limiter.queuedCount == 1)
        },
        test("a delivery failing at the observer is handed back; the batch behind it still delivers") {
            val delivered = ConcurrentLinkedQueue[String]()
            val recording = RecordingConsumer(p0)
            val l = listener(delivered, throwOn = Set("m2"))
            val wiring = ManualWiring(rate = 100)
            l.deliveryRateLimiter = Some(wiring.limiter)

            (1 to 3).foreach(i => l.received(recording.consumer, message(s"m$i", i.toLong)))
            wiring.drain()

            assertTrue(delivered.asScala.toVector == Vector("m1", "m3")) &&
            assertTrue(recording.handedBack.asScala.toVector == Vector("m2")) &&
            assertTrue(recording.acknowledged.asScala.toVector == Vector("m1", "m3"))
        },
        test("a permit release cannot resume a USER-paused session - the User reason still holds") {
            // The gate-shut REFUSAL this used to pin is gone by design: with per-reason
            // arbitration the limiter may record its hold any time, because releasing it can
            // never wake a consumer another owner still holds. What survives - and what actually
            // protected the user - is pinned here: pause, cycle a permit hold and release, and
            // the consumer must never see a resume.
            val recording = RecordingConsumer(p0)
            val l = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = _ => ()))
            val target = targetRunner(l, Map(p0 -> recording.consumer))

            target.pause() // the user's hold
            target.setPermitHold(true)
            target.setPermitHold(false)

            assertTrue(!recording.permitCalls.asScala.toVector.contains("resume")) ??
                s"calls=${recording.permitCalls.asScala.toVector}"
        },
        test("a REFUSED aggregate hold rolls its partial holds back - nothing stays paused for a hold that failed") {
            // holdPermits aggregates several consumers; one throwing makes the whole answer
            // false while the others already paused. Without the rollback those partial holds
            // sat in their arbiters with the limiter believing it owned nothing - paused forever.
            var holds = 0
            var releases = 0
            val pending = ArrayBuffer[Runnable]()
            var clock = 0L
            val core = DeliveryRateLimiterCore[String](nowMs = () => clock, payloadBytesOf = _ => 50L * 1024 * 1024)
            val limiter = DeliveryRateLimiter[String](
                core = core,
                schedule = (_, task) => { pending += task; () },
                process = _ => (),
                holdPermits = () => { holds += 1; false }, // the aggregate always refuses
                releasePermits = () => { releases += 1; true }
            )
            core.setRate(1000)

            (1 to 3).foreach(i => limiter.offer(s"m$i")) // crosses the byte mark
            val afterFirstCrossing = (holds, releases)
            limiter.offer("m4") // still over the mark: the un-set flag lets the next offer retry

            assertTrue(
                afterFirstCrossing == (1, 1), // refused hold -> immediate rollback release
                holds == 2, // and the retry happened
                releases == 2
            ) ?? s"holds=$holds releases=$releases"
        },
        test("a release that FAILS ONCE is retried on its own tick - a drained queue produces no other chance") {
            var releaseAttempts = 0
            val pending = ArrayBuffer[(Long, Runnable)]()
            var clock = 0L
            val core = DeliveryRateLimiterCore[String](nowMs = () => clock, payloadBytesOf = _ => 50L * 1024 * 1024)
            val limiter = DeliveryRateLimiter[String](
                core = core,
                schedule = (delay, task) => { pending += ((delay, task)); () },
                process = _ => (),
                holdPermits = () => true,
                releasePermits = () => { releaseAttempts += 1; releaseAttempts > 1 } // first release fails
            )
            core.setRate(1000)
            (1 to 3).foreach(i => limiter.offer(s"m$i")) // byte crossing: permits held

            clock += 1000
            def runAll(): Unit = { val t = pending.toVector; pending.clear(); t.foreach(_._2.run()) }
            runAll() // the drain empties the queue; the release attempt FAILS; a retry tick is armed
            val retryArmed = pending.nonEmpty && pending.forall(_._1 == deliveryRateLimitReleaseRetryDelayMs)
            runAll() // the retry succeeds

            assertTrue(
                releaseAttempts == 2,
                retryArmed,
                core.queuedCount == 0
            ) ?? s"attempts=$releaseAttempts retryArmed=$retryArmed pending=${pending.size}"
        },
        test("WHILE PAUSED, the unlimited inline path is refused - the message queues for the resume") {
            var processed = 0
            val pending = ArrayBuffer[Runnable]()
            val core = DeliveryRateLimiterCore[String](nowMs = () => 0L)
            val limiter = DeliveryRateLimiter[String](
                core = core,
                schedule = (_, task) => { pending += task; () },
                process = _ => processed += 1,
                holdPermits = () => true,
                releasePermits = () => true
            )
            // Rate 0 = the unlimited inline path... unless the user has the session paused: a
            // message arriving between the pause RPC and the consumers actually stopping used to
            // be processed (and acknowledged) inline - delivery after pause.
            limiter.pauseDraining()
            limiter.offer("m1")
            val processedWhilePaused = processed
            val queuedWhilePaused = core.queuedCount

            limiter.resumeDraining()
            val tasks = pending.toVector; pending.clear(); tasks.foreach(_.run())

            assertTrue(
                processedWhilePaused == 0,
                queuedWhilePaused == 1,
                processed == 1
            ) ?? s"processedWhilePaused=$processedWhilePaused queued=$queuedWhilePaused processed=$processed"
        },
        test("QUEUED BYTES hold the permits when the count never would - the fat-message watermark") {
            // 2000 queued 5 MB payloads is 10 GB the count watermark calls perfectly fine. The
            // byte watermark is the other half of the same backpressure: three fat payloads must
            // hold permits, and draining them must let go.
            var holds = 0
            var releases = 0
            val pending = ArrayBuffer[Runnable]()
            var clock = 0L
            val core = DeliveryRateLimiterCore[String](nowMs = () => clock, payloadBytesOf = _ => 50L * 1024 * 1024)
            val limiter = DeliveryRateLimiter[String](
                core = core,
                schedule = (_, task) => { pending += task; () },
                process = _ => (),
                holdPermits = () => { holds += 1; true },
                releasePermits = () => { releases += 1; true }
            )
            core.setRate(1000) // any non-zero rate forces the queue path

            limiter.offer("a")
            limiter.offer("b")
            val holdsAtTwo = holds // 100 MiB queued: still under the 128 MiB mark
            limiter.offer("c") // 150 MiB: over it, at a count of THREE
            val holdsAtThree = holds

            clock += 1000
            val tasks = pending.toVector; pending.clear()
            tasks.foreach(_.run()) // the drain empties the queue: bytes back under the low mark

            assertTrue(
                holdsAtTwo == 0,
                holdsAtThree == 1,
                holds == 1,
                releases == 1,
                core.queuedBytesCount == 0L
            ) ?? s"holds=$holds releases=$releases queuedBytes=${core.queuedBytesCount}"
        },
        test("with no other owner, a permit hold pauses and its release resumes - exactly once each") {
            val recording = RecordingConsumer(p0)
            val l = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = _ => ()))
            val target = targetRunner(l, Map(p0 -> recording.consumer))
            l.startAcceptingNewMessages()

            target.setPermitHold(true)
            target.setPermitHold(false)

            assertTrue(recording.permitCalls.asScala.toVector == Vector("pause", "resume")) ??
                s"calls=${recording.permitCalls.asScala.toVector}"
        },
        test("the runner refuses a hold while start-from counting is in flight, then grants it") {
            val recording = RecordingConsumer(p0)
            val l = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = _ => ()))
            l.startAcceptingNewMessages()
            val runner = session(targetRunner(l, Map(p0 -> recording.consumer)))
            // A real rate, so offers actually QUEUE - at 0 everything passes inline, the watermark
            // is never reached, and this whole test measures nothing.
            runner.deliveryRateLimiter.core.setRate(1)

            // A counted skip still has 5 to drop: the limiter crossing its watermark must NOT pause
            // the consumers - a throttled-quiet stream is indistinguishable from the silent stream
            // the merge gives up on.
            l.startFromDiscard = StartFromDiscard.shared(5)
            (1 to deliveryRateLimitHoldPermitsAboveQueued + 1)
                .foreach(i => runner.deliveryRateLimiter.offer(HeldMessage(recording.consumer, message(s"m$i", i.toLong), l)))
            val pausesDuringResolution = recording.permitCalls.asScala.count(_ == "pause")
            val queuedDuringResolution = runner.deliveryRateLimiter.queuedCount

            // The skip finishes; the very next crossing offer must re-assert the hold.
            (1 to 5).foreach(_ => l.startFromDiscard.claim(p0))
            runner.deliveryRateLimiter.offer(HeldMessage(recording.consumer, message("late", 9999L), l))

            // The vacuity guard first: the backlog really did cross the watermark while refused.
            assertTrue(queuedDuringResolution >= deliveryRateLimitHoldPermitsAboveQueued) &&
            assertTrue(pausesDuringResolution == 0) &&
            assertTrue(recording.permitCalls.asScala.count(_ == "pause") == 1)
        },
        test("TWO TOPICS through one limiter: per-topic order holds, acks land on the right consumer") {
            // One target consuming two topics has ONE listener and one limiter; the limit is per
            // session, so both topics share the queue. Per-topic relative order must survive it,
            // and each delivery must acknowledge on the consumer it arrived through.
            val p1 = "persistent://public/default/rate-limit-wiring-1"
            val delivered = ConcurrentLinkedQueue[String]()
            val c0 = RecordingConsumer(p0)
            val c1 = RecordingConsumer(p1)
            val l = listener(delivered)
            val wiring = ManualWiring(rate = 100)
            l.deliveryRateLimiter = Some(wiring.limiter)

            l.received(c0.consumer, messageOn(p0, "a1", 100L, 0L))
            l.received(c1.consumer, messageOn(p1, "b1", 110L, 0L))
            l.received(c0.consumer, messageOn(p0, "a2", 120L, 1L))
            l.received(c1.consumer, messageOn(p1, "b2", 130L, 1L))
            wiring.drain()

            val out = delivered.asScala.toVector
            assertTrue(out == Vector("a1", "b1", "a2", "b2")) &&
            assertTrue(c0.acknowledged.asScala.toVector == Vector("a1", "a2")) &&
            assertTrue(c1.acknowledged.asScala.toVector == Vector("b1", "b2"))
        },
        test("the MERGE'S GLOBAL ORDER survives the limiter, even when arrival order fights it") {
            // Two topics, arrival deliberately INVERTED against publish time: all of p0 arrives
            // before any of p1. A global skip of 1 must drop the globally-oldest (a1, which arrived
            // first but is only oldest by publish time), and everything DELIVERED must come out in
            // the merge's key order - b1 (pt 200) before a2 (pt 300) - not in arrival order, and
            // the limiter's queue must preserve exactly that decision order through its drain.
            val p1 = "persistent://public/default/rate-limit-wiring-merge-1"
            val delivered = ConcurrentLinkedQueue[String]()
            val c0 = RecordingConsumer(p0)
            val c1 = RecordingConsumer(p1)
            val l = listener(delivered)
            l.startFromOrdering = StartFromOrdering.make[HeldMessage](
                StartFromOrderingPlan.GlobalSkip(1, Vector(
                    StartFromStream(startFromStreamId(consumerName, p0), EntryPosition(1L, 1L, -1, 1)),
                    StartFromStream(startFromStreamId(consumerName, p1), EntryPosition(1L, 1L, -1, 1))
                ))
            )
            val wiring = ManualWiring(rate = 100)
            l.deliveryRateLimiter = Some(wiring.limiter)

            l.received(c0.consumer, messageOn(p0, "a1", 100L, 0L))
            l.received(c0.consumer, messageOn(p0, "a2", 300L, 1L))
            l.received(c1.consumer, messageOn(p1, "b1", 200L, 0L))
            l.received(c1.consumer, messageOn(p1, "b2", 400L, 1L))
            wiring.drain()

            // a1 was DROPPED - acknowledged immediately, never delivered, never rate limited.
            assertTrue(delivered.asScala.toVector == Vector("b1", "a2", "b2")) &&
            assertTrue(c0.acknowledged.asScala.headOption.contains("a1")) &&
            assertTrue(!delivered.asScala.toVector.contains("a1"))
        },
        test("GUARANTEED spends no rate token while it is waiting for another topic") {
            val p1 = "persistent://public/default/rate-limit-wiring-guaranteed-1"
            val delivered = ConcurrentLinkedQueue[String]()
            val c0 = RecordingConsumer(p0)
            val c1 = RecordingConsumer(p1)
            val l = listener(delivered)
            l.startFromOrdering = StartFromOrdering.make[HeldMessage](
                StartFromOrderingPlan.Ordered(
                    // Far-future recorded ends: these streams are MID-REPLAY - the barrier must
                    // wait on them, and nothing here is past the boundary.
                    Vector(
                        StartFromStream(startFromStreamId(consumerName, p0), EntryPosition(1L, 1_000_000L, -1, 1)),
                        StartFromStream(startFromStreamId(consumerName, p1), EntryPosition(1L, 1_000_000L, -1, 1))
                    ),
                    _root_.consumer.session_config.MessageDeliveryOrder.Guaranteed
                )
            )
            val wiring = ManualWiring(rate = 1)
            l.deliveryRateLimiter = Some(wiring.limiter)

            // p0 alone is not safe: Guaranteed still waits for p1. That wait must leave the one
            // initial token untouched, so p0 can be delivered as soon as p1 supplies its head.
            l.received(c0.consumer, messageOn(p0, "a", 100L, 0L))
            val beforeP1 = delivered.asScala.toVector
            l.received(c1.consumer, messageOn(p1, "b", 200L, 0L))

            assertTrue(beforeP1.isEmpty) &&
            assertTrue(delivered.asScala.toVector == Vector("a")) &&
            assertTrue(c0.acknowledged.asScala.toVector == Vector("a"))
        },
        test("GUARANTEED hands the rate token back when the send fails - the retry is not charged twice") {
            // rate 1 and a hand clock that never moves: the bucket holds exactly one token, ever.
            // The first send attempt FAILS (a cancelled client); the head stays in the merge and
            // the pump's next tick retries it. Without the refund that retry finds an empty
            // bucket - the failed attempt burned the only token - and the head sits for a full
            // simulated second on top of the latency the failure already cost.
            val p1 = "persistent://public/default/rate-limit-wiring-guaranteed-refund-1"
            val delivered = ConcurrentLinkedQueue[String]()
            val c0 = RecordingConsumer(p0)
            val c1 = RecordingConsumer(p1)
            var failNext = true
            val l = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = msg =>
                if failNext then
                    failNext = false
                    throw io.grpc.StatusRuntimeException(io.grpc.Status.CANCELLED)
                delivered.add(msg.getKey)
                ()
            ))
            l.startAcceptingNewMessages()
            l.startFromOrdering = StartFromOrdering.make[HeldMessage](
                StartFromOrderingPlan.Ordered(
                    // Far-future recorded ends: mid-replay streams, nothing past the boundary.
                    Vector(
                        StartFromStream(startFromStreamId(consumerName, p0), EntryPosition(1L, 1_000_000L, -1, 1)),
                        StartFromStream(startFromStreamId(consumerName, p1), EntryPosition(1L, 1_000_000L, -1, 1))
                    ),
                    _root_.consumer.session_config.MessageDeliveryOrder.Guaranteed
                )
            )
            val wiring = ManualWiring(rate = 1)
            l.deliveryRateLimiter = Some(wiring.limiter)

            l.received(c0.consumer, messageOn(p0, "a", 100L, 0L)) // waits on p1
            l.received(c1.consumer, messageOn(p1, "b", 200L, 0L)) // both heads: the pump tries "a" and the send fails
            val deliveredAfterFailure = delivered.asScala.toVector
            l.sweepStartFromStall() // the pump's retry timer - it must find the refunded token

            assertTrue(
                deliveredAfterFailure.isEmpty, // the failed attempt delivered nothing...
                delivered.asScala.toVector == Vector("a"), // ...and the retry needed no fresh token
                c0.acknowledged.asScala.toVector == Vector("a")
            ) ?? s"afterFailure=$deliveredAfterFailure delivered=${delivered.asScala.toVector}"
        },
        test("resume installs the SHARED limiter on the listener, with the requested rate") {
            val delivered = ConcurrentLinkedQueue[String]()
            val recording = RecordingConsumer(p0)
            val l = listener(delivered)
            val runner = session(targetRunner(l, Map(p0 -> recording.consumer)))

            val before = l.deliveryRateLimiter

            runner.resume(new io.grpc.stub.StreamObserver[com.tools.teal.pulsar.ui.api.v1.consumer.ResumeResponse] {
                override def onNext(value: com.tools.teal.pulsar.ui.api.v1.consumer.ResumeResponse): Unit = ()
                override def onError(t: Throwable): Unit = ()
                override def onCompleted(): Unit = ()
            }, isDebug = false, includeConsumerStats = true, maxMessagesPerSecond = 123)

            assertTrue(before.isEmpty) &&
            assertTrue(l.deliveryRateLimiter.contains(runner.deliveryRateLimiter)) &&
            assertTrue(runner.deliveryRateLimiter.core.rate == 123L)
        }
    )
