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
import java.util.concurrent.atomic.{AtomicBoolean, AtomicLong}
import java.util.concurrent.{CompletableFuture, ConcurrentLinkedQueue}
import scala.collection.mutable.ArrayBuffer
import scala.jdk.CollectionConverters.*

/** WHAT KEEPS A LIMITED SESSION ALIVE AND BOUNDED WHEN PAUSE, A FAILED RELEASE AND A COUNTED
  * START-FROM MEET.
  *
  * Three defects live in the seams BETWEEN the limiter's mechanisms, which is why the suites that
  * cover each mechanism on its own are all green:
  *
  *   - a Resume landing INSIDE the paused tick found the drain flag still armed, scheduled nothing,
  *     and then watched the tick give the flag back - a finite backlog stuck forever with the UI
  *     saying Running (`deliveryRateLimiterTest` pauses, ticks and resumes SEQUENTIALLY, so the
  *     interleaving cannot occur there);
  *   - the single retry of a FAILED permit release was armed as an ordinary drain tick, so a user
  *     pause swallowed it, and Resume only re-arms a drain when something is QUEUED - which it
  *     never is after the drain that failed the release. Every consumer stayed held by the Limiter
  *     for the rest of the session (the suite covers failed release and paused re-arming, never
  *     their intersection);
  *   - permit-hold eligibility was decided for the WHOLE SESSION, so one latest-n correction that
  *     never finishes on a disconnected stream refused backpressure for every other stream, and a
  *     hot peer fed an unbounded queue while the watermarks were declined over and over.
  *
  * Everything is offline and deterministic: hand-cranked schedulers, a hand-cranked clock, proxy
  * consumers, and - for the lost-wakeup race - the core's own monitor as the barrier that pins the
  * interleaving. No sleeps, and nothing repeated until it happens to land.
  */
object deliveryBackpressureRaceTest extends ZIOSpecDefault:

    private val consumerName = "cs-backpressure-race"
    private val p0 = "persistent://public/default/cs-backpressure-race-0"
    private val hotTopic = "persistent://public/default/cs-backpressure-race-hot"
    private val stuckTopic = "persistent://public/default/cs-backpressure-race-stuck"

    /** A consumer whose RUNNING state is observable, and whose `resume` can be made to fail the way
      * a client mid-reconnect does - the trigger for the release retry this suite is about. */
    private final class RecordingConsumer(topicFqn: String, resumeFailures: Int = 0):
        val permitCalls = ConcurrentLinkedQueue[String]()
        val isPaused = AtomicBoolean(false)
        private val resumesToFail = java.util.concurrent.atomic.AtomicInteger(resumeFailures)

        val consumer: Consumer[Array[Byte]] =
            val handler = new InvocationHandler:
                override def invoke(proxy: Object, method: Method, args: Array[Object]): Object =
                    method.getName match
                        case "getTopic"        => topicFqn
                        case "getConsumerName" => consumerName
                        case "isConnected"     => java.lang.Boolean.TRUE
                        case "pause" =>
                            permitCalls.add("pause")
                            isPaused.set(true)
                            null
                        case "resume" =>
                            permitCalls.add("resume")
                            if resumesToFail.getAndUpdate(n => math.max(0, n - 1)) > 0 then
                                throw new IllegalStateException("the consumer is reconnecting and cannot take a resume")
                            isPaused.set(false)
                            null
                        case "acknowledgeAsync" => CompletableFuture.completedFuture(null)
                        case "negativeAcknowledge" => null
                        case "equals"   => java.lang.Boolean.valueOf(proxy eq args(0))
                        case "hashCode" => java.lang.Integer.valueOf(topicFqn.hashCode)
                        case "toString" => s"proxy-consumer($topicFqn)"
                        case _          => null
            Proxy
                .newProxyInstance(getClass.getClassLoader, Array[Class[?]](classOf[Consumer[Array[Byte]]]), handler)
                .asInstanceOf[Consumer[Array[Byte]]]

    /** A FAT message - the shape the byte watermark exists for, small enough that a broken run's
      * unbounded backlog still fits in a test JVM. */
    private val payloadBytes = 4 * 1024

    private def message(topicFqn: String, key: String, entryId: Long): MessageImpl[Array[Byte]] =
        val md = new MessageMetadata()
        md.setPublishTime(1000L + entryId)
        md.setPartitionKey(key)
        val payload = Array.fill[Byte](payloadBytes)('x'.toByte)
        val msg = MessageImpl.create[Array[Byte]](md, ByteBuffer.wrap(payload), Schema.BYTES, topicFqn)
        msg.setMessageId(new MessageIdImpl(1L, entryId, -1))
        msg

    private def listener(): ConsumerListener =
        val l = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = _ => ()))
        l.startAcceptingNewMessages()
        l

    private def targetRunner(consumerListener: ConsumerListener, consumers: Map[String, Consumer[Array[Byte]]]): ConsumerSessionTargetRunner =
        ConsumerSessionTargetRunner(
            targetIndex = 0,
            targetConfig = ConsumerSessionTarget(
                isEnabled = true,
                consumptionMode = ConsumerSessionTargetConsumptionMode(mode = RegularConsumptionMode()),
                messageValueDeserializer = Deserializer(deserializer = UseLatestTopicSchema()),
                topicSelector = TopicSelector(topicSelector = MultiTopicSelector(topicFqns = consumers.keys.toVector)),
                messageFilterChain = MessageFilterChain.empty,
                coloringRuleChain = ColoringRuleChain.empty,
                valueProjectionList = ValueProjectionList(isEnabled = false, projections = Vector.empty)
            ),
            nonPartitionedTopicFqns = consumers.keys.toVector,
            schemasByTopic = Map.empty,
            sessionContextPool = ConsumerSessionContextPool(),
            consumers = consumers,
            pauseArbiters = consumers.map((fqn, c) => fqn -> ConsumerPauseArbiter(c)),
            consumerListener = consumerListener,
            stats = ConsumerSessionTargetStats(messageProcessed = AtomicLong(0))
        )

    private def session(target: ConsumerSessionTargetRunner): ConsumerSessionRunner =
        ConsumerSessionRunner(
            sessionName = "cs-backpressure-race",
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

    private def worker(name: String)(body: => Unit): Thread =
        val t = new Thread((() => body): Runnable, name)
        t.setDaemon(true)
        t

    /** THE BARRIER THAT PINS THE LOST-WAKEUP INTERLEAVING, and the reason it is not a poll for
      * something that might never happen: the tick thread's paused branch reads the pause flag and
      * then UNCONDITIONALLY enters the core's monitor, which this thread is holding. So the only
      * state it can reach is BLOCKED, it always reaches it, and reaching it proves the pause flag
      * has already been read. Bounded so a regression fails loudly instead of hanging the suite.
      */
    private def awaitBlockedOnCoreLock(t: Thread): Unit =
        val deadline = java.lang.System.nanoTime() + 30_000_000_000L
        while t.getState != Thread.State.BLOCKED && java.lang.System.nanoTime() < deadline do Thread.onSpinWait()
        if t.getState != Thread.State.BLOCKED then
            throw new AssertionError(s"the paused tick never reached the core lock; its state is ${t.getState}")

    /** Offer fat messages one at a time until the hot consumer's permits are held, or until `cap` -
      * the stand-in for "the broker keeps delivering". Answers how many were offered: a session
      * whose backpressure works stops WELL below the cap, a session whose backpressure is refused
      * runs to it.
      */
    private def floodUntilHeld(
        limiter: DeliveryRateLimiter[HeldMessage],
        consumer: Consumer[Array[Byte]],
        isPaused: AtomicBoolean,
        listener: ConsumerListener,
        cap: Int
    ): Int =
        var offered = 0
        while offered < cap && !isPaused.get do
            limiter.offer(HeldMessage(consumer, message(consumer.getTopic, s"m$offered", offered.toLong), listener))
            offered += 1
        offered

    def spec = suite("delivery backpressure races")(
        test("P1.5: a Resume landing INSIDE the paused tick must not lose the backlog's only wakeup") {
            // The interleaving the sequential pause/tick/resume test cannot produce:
            //   1. the armed tick reads drainingPaused = true;
            //   2. Resume clears the flag and calls rearmDrain;
            //   3. rearmDrain sees drainScheduled = true and schedules NOTHING;
            //   4. the paused tick then clears drainScheduled and exits.
            // Queue nonempty, no timer, and nothing further has to arrive - the backlog is stuck
            // for good while the session says Running.
            val pending = ConcurrentLinkedQueue[Runnable]()
            val processed = ConcurrentLinkedQueue[Int]()
            val core = DeliveryRateLimiterCore[Int](nowMs = () => 0L)
            val limiter = DeliveryRateLimiter[Int](
                core = core,
                schedule = (_, task) => { pending.add(task); () },
                process = i => { processed.add(i); () },
                holdPermits = () => true,
                releasePermits = () => true
            )
            core.setRate(100)

            (1 to 5).foreach(limiter.offer(_))
            val armedTick = pending.poll() // the one timer this backlog armed
            limiter.pauseDraining()

            val tickThread = worker("p15-paused-tick")(armedTick.run())
            core.synchronized {
                tickThread.start()
                // The tick has read "paused" and is parked at the core lock this thread holds.
                awaitBlockedOnCoreLock(tickThread)
                // The Resume lands exactly here - after the decision, before the flag is handed back.
                limiter.resumeDraining()
            }
            tickThread.join(30_000)

            // Nothing new is offered, and nothing else is required to arrive: whatever timers exist
            // now are all the backlog will ever get.
            var guard = 0
            while !pending.isEmpty && guard < 50 do
                pending.poll().run()
                guard += 1

            assertTrue(
                processed.asScala.toVector == (1 to 5).toVector,
                core.queuedCount == 0
            ) ?? s"processed=${processed.asScala.toVector} queued=${core.queuedCount} timersLeft=${pending.size}"
        },
        test("P1.6: a user pause must not swallow the ONLY retry of a failed permit release") {
            // The real arbiter and a real consumer, so the assertion is the one that matters: after
            // the user resumes, is the consumer actually RUNNING again?
            val recording = RecordingConsumer(p0, resumeFailures = 1)
            val l = listener()
            val target = targetRunner(l, Map(p0 -> recording.consumer))

            val pending = ArrayBuffer[(Long, Runnable)]()
            var clock = 0L
            val core = DeliveryRateLimiterCore[String](nowMs = () => clock, payloadBytesOf = _ => 50L * 1024 * 1024)
            val limiter = DeliveryRateLimiter[String](
                core = core,
                schedule = (delay, task) => { pending += ((delay, task)); () },
                process = _ => (),
                holdPermits = () => target.setPermitHold(true),
                releasePermits = () => target.setPermitHold(false)
            )
            core.setRate(1000)

            def runAll(): Unit =
                val tasks = pending.toVector
                pending.clear()
                tasks.foreach(_._2.run())

            (1 to 3).foreach(i => limiter.offer(s"m$i")) // 150 MiB queued: over the byte watermark
            val pausedByLimiter = recording.isPaused.get

            clock += 1000
            runAll() // the drain empties the queue; the release throws; ONE retry is armed
            val pausedAfterFailedRelease = recording.isPaused.get

            // The user pauses BEFORE the retry fires. Armed as an ordinary drain tick, that retry
            // is consumed by the paused branch and never happens.
            limiter.pauseDraining()
            runAll()

            // Resume. The queue is empty - the drain that failed the release emptied it - so
            // rearmDrain schedules nothing and no crossing will ever come to notice.
            limiter.resumeDraining()
            runAll()
            runAll()

            assertTrue(
                pausedByLimiter, // the vacuity guard: the hold really did engage
                pausedAfterFailedRelease, // and the failed release really did leave it held
                !recording.isPaused.get // ...and the user's Resume must have got the consumer back
            ) ?? s"calls=${recording.permitCalls.asScala.toVector} pausedNow=${recording.isPaused.get}"
        },
        test("P1.7: a stuck latest-n correction on ONE stream must not disable backpressure for a hot one") {
            // Latest-n corrects each topic's seek overshoot with a PER-TOPIC discard. One stream is
            // disconnected or simply idle and never delivers the messages its correction is waiting
            // for; the other keeps supplying visible ones. Session-wide eligibility turned that into
            // "no permit hold, ever" - so the hot stream's deliveries piled into an unbounded queue
            // with the watermark refused on every crossing.
            val hot = RecordingConsumer(hotTopic)
            val stuck = RecordingConsumer(stuckTopic)
            val l = listener()
            l.startFromDiscard = StartFromDiscard.perTopic(Map(stuckTopic -> 3L, hotTopic -> 0L))
            val runner = session(targetRunner(l, Map(hotTopic -> hot.consumer, stuckTopic -> stuck.consumer)))
            val limiter = runner.deliveryRateLimiter

            // A low rate limit, and the drain held still so the backlog is exactly what arrived:
            // whatever the queue holds at the end, nothing was quietly delivered away.
            limiter.core.setRate(1)
            limiter.pauseDraining()

            val cap = deliveryRateLimitHoldPermitsAboveQueued * 3
            val offered = floodUntilHeld(limiter, hot.consumer, hot.isPaused, l, cap)

            assertTrue(
                l.effectiveDiscard.remaining == 3L, // the vacuity guard: the correction really is stuck
                hot.isPaused.get, // the hot stream is what backpressure must reach...
                !stuck.isPaused.get, // ...and the stream still counting must be left alone
                offered < cap,
                limiter.queuedCount <= deliveryRateLimitHoldPermitsAboveQueued,
                limiter.queuedCount == offered // nothing was dropped to achieve the bound
            ) ?? (s"offered=$offered queued=${limiter.queuedCount} bytes=${limiter.core.queuedBytesCount} " +
                s"hotPaused=${hot.isPaused.get} stuckPaused=${stuck.isPaused.get}")
        },
        test("P1.7: past the ABSOLUTE ceiling the hold happens anyway, suppression and all") {
            // A SHARED "skip first n" that never resolves: any stream can supply the next skipped
            // message, so per-stream eligibility correctly protects every one of them - and with
            // nothing left to hold, only a hard ceiling stands between one hot stream and the heap.
            val hot = RecordingConsumer(hotTopic)
            val l = listener()
            l.startFromDiscard = StartFromDiscard.shared(5)
            val runner = session(targetRunner(l, Map(hotTopic -> hot.consumer)))
            val limiter = runner.deliveryRateLimiter

            limiter.core.setRate(1)
            limiter.pauseDraining()

            val cap = deliveryRateLimitForceHoldPermitsAboveQueued + deliveryRateLimitHoldPermitsAboveQueued
            val offered = floodUntilHeld(limiter, hot.consumer, hot.isPaused, l, cap)

            assertTrue(
                l.effectiveDiscard.remaining == 5L, // the vacuity guard: the skip really is unresolved
                hot.isPaused.get,
                offered < cap,
                limiter.queuedCount <= deliveryRateLimitForceHoldPermitsAboveQueued,
                limiter.queuedCount == offered // held, not dropped
            ) ?? s"offered=$offered queued=${limiter.queuedCount} hotPaused=${hot.isPaused.get}"
        }
    ) @@ TestAspect.sequential
