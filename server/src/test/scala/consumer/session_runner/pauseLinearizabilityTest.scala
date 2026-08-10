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
import org.apache.pulsar.client.api.Consumer
import zio.test.*

import java.lang.reflect.{InvocationHandler, Method, Proxy}
import java.util.concurrent.atomic.{AtomicBoolean, AtomicInteger, AtomicLong}
import java.util.concurrent.{CompletableFuture, ConcurrentLinkedQueue, CountDownLatch}

/** WHEN PAUSE RETURNS, NOTHING MAY STILL BE ON ITS WAY TO THE CLIENT.
  *
  * The limiter's drain loop reads the pause flag once per item and then calls the delivery, so a
  * Pause landing between the read and the call was answered OK while that item went on to be sent
  * and ACKNOWLEDGED - a delivery after the pause the user was told had taken effect. And the
  * session's own `pause` paused every TARGET first and only then stopped the drainer, so on a wide
  * session the queued backlog kept draining for the whole length of that (up to 2,000 consumer)
  * walk.
  *
  * Both are pinned here with real threads and latches - no sleeps: the delivery is frozen INSIDE
  * the send, and the question asked of Pause is simply whether it came back before that send did.
  */
object pauseLinearizabilityTest extends ZIOSpecDefault:

    private val topicFqn = "persistent://public/default/cs-pause-linearizability"

    private def worker(name: String)(body: => Unit): Thread =
        val t = new Thread((() => body): Runnable, name)
        t.setDaemon(true)
        t

    /** Spin until `condition` holds. Bounded so a regression fails loudly instead of hanging. */
    private def spinUntil(what: String)(condition: => Boolean): Unit =
        val deadline = java.lang.System.nanoTime() + 30_000_000_000L
        while !condition && java.lang.System.nanoTime() < deadline do Thread.onSpinWait()
        if !condition then throw new AssertionError(s"timed out waiting for $what")

    /** Wait until `t` has SETTLED: either parked (the pause is waiting for the delivery boundary) or
      * finished (the pause returned without waiting - the defect). Both are reached promptly, so
      * this answers quickly whichever way the code behaves. */
    private def awaitSettled(t: Thread): Thread.State =
        spinUntil(s"thread ${t.getName} to settle") {
            t.getState match
                case Thread.State.WAITING | Thread.State.TIMED_WAITING | Thread.State.TERMINATED => true
                case _                                                                           => false
        }
        t.getState

    /** A consumer that records, at the moment its permits are paused, whether the session's delivery
      * pacer had ALREADY been stopped. */
    private final class OrderRecordingConsumer(observe: () => Boolean):
        val drainerWasStoppedFirst = ConcurrentLinkedQueue[java.lang.Boolean]()

        val consumer: Consumer[Array[Byte]] =
            val handler = new InvocationHandler:
                override def invoke(proxy: Object, method: Method, args: Array[Object]): Object =
                    method.getName match
                        case "getTopic"        => topicFqn
                        case "getConsumerName" => "cs-pause-linearizability-0"
                        case "isConnected"     => java.lang.Boolean.TRUE
                        case "pause" =>
                            drainerWasStoppedFirst.add(java.lang.Boolean.valueOf(observe()))
                            null
                        case "resume"              => null
                        case "acknowledgeAsync"    => CompletableFuture.completedFuture(null)
                        case "negativeAcknowledge" => null
                        case "equals"              => java.lang.Boolean.valueOf(proxy eq args(0))
                        case "hashCode"            => java.lang.Integer.valueOf(topicFqn.hashCode)
                        case "toString"            => s"proxy-consumer($topicFqn)"
                        case _                     => null
            Proxy
                .newProxyInstance(getClass.getClassLoader, Array[Class[?]](classOf[Consumer[Array[Byte]]]), handler)
                .asInstanceOf[Consumer[Array[Byte]]]

    private def session(consumers: Map[String, Consumer[Array[Byte]]]): ConsumerSessionRunner =
        val listener = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = _ => ()))
        listener.startAcceptingNewMessages()
        val target = ConsumerSessionTargetRunner(
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
            consumerListener = listener,
            stats = ConsumerSessionTargetStats(messageProcessed = AtomicLong(0))
        )
        ConsumerSessionRunner(
            sessionName = "cs-pause-linearizability",
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

    def spec = suite("pause is linearizable against an in-flight delivery")(
        test("P2.1: Pause must not return while a delivery it already admitted is still sending") {
            // The window: the drain loop evaluates `!paused`, Pause sets the flag and answers the
            // client, and only THEN does the already-admitted item run - so a message was sent and
            // acknowledged after the user was told the session had stopped.
            val pending = ConcurrentLinkedQueue[Runnable]()
            val sent = ConcurrentLinkedQueue[Int]()
            val deliveryStarted = AtomicBoolean(false)
            val releaseDelivery = CountDownLatch(1)

            val core = DeliveryRateLimiterCore[Int](nowMs = () => 0L)
            val limiter = DeliveryRateLimiter[Int](
                core = core,
                schedule = (_, task) => { pending.add(task); () },
                // The send/ACK, frozen open: everything the browser and the broker learn about this
                // message happens on the far side of the latch.
                process = i =>
                    deliveryStarted.set(true)
                    releaseDelivery.await()
                    sent.add(i)
                    ()
                ,
                holdPermits = () => true,
                releasePermits = () => true
            )
            core.setRate(100)

            (1 to 3).foreach(limiter.offer(_))
            val armedTick = pending.poll()

            val drainThread = worker("p21-drain")(armedTick.run())
            drainThread.start()
            spinUntil("the drain to enter its first delivery")(deliveryStarted.get)

            val sentWhenPauseReturned = AtomicInteger(-1)
            val pauseThread = worker("p21-pause") {
                limiter.pauseDraining()
                sentWhenPauseReturned.set(sent.size)
            }
            pauseThread.start()
            // Either it parks at the delivery boundary (correct) or it runs straight through and
            // terminates (the defect). Both settle at once, so nothing here is timing-sensitive.
            val pauseState = awaitSettled(pauseThread)

            releaseDelivery.countDown()
            drainThread.join(30_000)
            pauseThread.join(30_000)

            assertTrue(
                pauseState != Thread.State.TERMINATED, // Pause waited rather than answering over an open send
                sentWhenPauseReturned.get == 1, // ...and the send it waited for had completed
                sent.size == 1 // ...while the rest of the batch never left the queue
            ) ?? s"pauseState=$pauseState sentWhenPauseReturned=${sentWhenPauseReturned.get} sent=${sent.size} queued=${core.queuedCount}"
        },
        test("P2.1: a delivery may not START once Pause has returned") {
            // The same window seen from the other side: an item the drain had NOT yet admitted must
            // be refused outright, however late the drain thread gets around to it.
            val pending = ConcurrentLinkedQueue[Runnable]()
            val sent = ConcurrentLinkedQueue[Int]()
            val core = DeliveryRateLimiterCore[Int](nowMs = () => 0L)
            val limiter = DeliveryRateLimiter[Int](
                core = core,
                schedule = (_, task) => { pending.add(task); () },
                process = i => { sent.add(i); () },
                holdPermits = () => true,
                releasePermits = () => true
            )
            core.setRate(100)
            (1 to 3).foreach(limiter.offer(_))
            val armedTick = pending.poll()

            limiter.pauseDraining()
            armedTick.run()

            assertTrue(sent.isEmpty, core.queuedCount == 3)
        },
        test("P2.1: the delivery budget's own pause, made from INSIDE a delivery, must not wait for itself") {
            // `sendPrepared` pauses the drain the moment the last budgeted message is sent - on the
            // delivery thread, inside the delivery. A quiesce wait that did not recognise its own
            // caller would deadlock the session exactly when its budget ran out.
            val pending = ConcurrentLinkedQueue[Runnable]()
            val sent = ConcurrentLinkedQueue[Int]()
            val holder = scala.collection.mutable.ArrayBuffer[DeliveryRateLimiter[Int]]()
            val core = DeliveryRateLimiterCore[Int](nowMs = () => 0L)
            val limiter = DeliveryRateLimiter[Int](
                core = core,
                schedule = (_, task) => { pending.add(task); () },
                process = i =>
                    sent.add(i)
                    if i == 2 then holder.head.pauseDraining()
                    ()
                ,
                holdPermits = () => true,
                releasePermits = () => true
            )
            holder += limiter
            core.setRate(100)
            (1 to 5).foreach(limiter.offer(_))

            val tick = pending.poll()
            val tickThread = worker("p21-budget")(tick.run())
            tickThread.start()
            tickThread.join(30_000)

            assertTrue(
                !tickThread.isAlive, // it came back at all: the budget pause did not wait on itself
                sent.size == 2, // and it stopped the line exactly at the message that spent the budget
                core.queuedCount == 3
            ) ?? s"alive=${tickThread.isAlive} sent=${sent.size} queued=${core.queuedCount}"
        },
        test("P2.1: the session's pause stops the DRAINER before it walks the targets") {
            // `pause` paused every target first and only stopped the pacer in its `finally`, so on a
            // 2,000-stream session the queued backlog went on being delivered and acknowledged for
            // the whole length of that walk - after the user had asked for the session to stop.
            val holder = scala.collection.mutable.ArrayBuffer[ConsumerSessionRunner]()
            val probe = OrderRecordingConsumer(() => holder.head.deliveryRateLimiter.isDrainingPausedNow)
            val runner = session(Map(topicFqn -> probe.consumer))
            holder += runner

            runner.pause()

            assertTrue(
                probe.drainerWasStoppedFirst.size == 1, // vacuity guard: the consumer really was paused
                probe.drainerWasStoppedFirst.peek == java.lang.Boolean.TRUE
            ) ?? s"observations=${probe.drainerWasStoppedFirst.toArray.mkString(",")}"
        }
    ) @@ TestAspect.sequential
