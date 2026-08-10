package consumer

import _root_.consumer.coloring_rules.ColoringRuleChain
import _root_.consumer.deserializer.Deserializer
import _root_.consumer.deserializer.deserializers.UseLatestTopicSchema
import _root_.consumer.message_filter.MessageFilterChain
import _root_.consumer.pause_trigger.ConsumerSessionPauseTriggerChain
import _root_.consumer.session_config.ConsumerSessionConfig
import _root_.consumer.session_runner.*
import _root_.consumer.session_target.ConsumerSessionTarget
import _root_.consumer.session_target.consumption_mode.ConsumerSessionTargetConsumptionMode
import _root_.consumer.session_target.consumption_mode.modes.RegularConsumptionMode
import _root_.consumer.session_target.topic_selector.{MultiTopicSelector, TopicSelector}
import _root_.consumer.start_from.EarliestMessage
import _root_.consumer.value_projections.ValueProjectionList
import com.tools.teal.pulsar.ui.api.v1.consumer as consumerPb
import org.apache.pulsar.client.api.Consumer
import zio.test.*

import java.lang.reflect.{InvocationHandler, Method, Proxy}
import java.util.concurrent.atomic.{AtomicBoolean, AtomicInteger, AtomicLong}
import java.util.concurrent.{ConcurrentHashMap, ConcurrentLinkedQueue, CountDownLatch, TimeUnit}
import scala.concurrent.Await
import scala.concurrent.duration.{Duration, SECONDS}
import scala.jdk.CollectionConverters.*

/** CREATE AND DELETE UNDER ONE SESSION NAME ARE ONE OPERATION, NOT TWO.
  *
  * Every target of a session subscribes as `${sessionName}-${targetIndex}`, NON-DURABLE and
  * EXCLUSIVE. Two runners under one name are therefore not merely wasteful, they are mutually
  * exclusive on the broker: whichever subscribes second is refused outright.
  *
  * Two orderings made that reachable from ordinary use, and the browser re-creates a session on
  * every configuration change, so both were the common path rather than a corner:
  *
  *   - CREATE built and SUBSCRIBED the replacement in full and only then stopped the session it was
  *     replacing, so on the same topic the still-live predecessor rejected it before the atomic map
  *     swap was ever reached;
  *   - DELETE read the runner, stopped it, and then removed the NAME unconditionally - so a create
  *     that installed a new session meanwhile had its session silently unhooked, left running with
  *     nothing holding a handle to it.
  *
  * The broker sits behind proxy consumers and an injected session builder, so all of it runs
  * offline.
  */
object consumerServiceLifecycleTest extends ZIOSpecDefault:

    private val topicFqn = "persistent://public/default/lifecycle"
    private val sessionName = "cs-lifecycle"

    /** A consumer that records what was done to it and can be held inside `unsubscribe`, which is
      * where `stop` spends its time in production. `unsubscribeEntered` lets a test wait until a
      * stop is COMMITTED to its broker work; `unsubscribeFails` makes the stop report a failure. */
    private final class RecordingConsumer(label: String, unsubscribeGate: Option[CountDownLatch] = None, unsubscribeFails: Boolean = false):
        val unsubscribed = AtomicBoolean(false)
        val closed = AtomicBoolean(false)
        val unsubscribeEntered = CountDownLatch(1)

        val consumer: Consumer[Array[Byte]] =
            val handler = new InvocationHandler:
                override def invoke(proxy: Object, method: Method, args: Array[Object]): Object =
                    method.getName match
                        case "getTopic" => topicFqn
                        case "unsubscribe" =>
                            unsubscribeEntered.countDown()
                            unsubscribeGate.foreach(_.await(60, TimeUnit.SECONDS))
                            unsubscribed.set(true)
                            if unsubscribeFails then throw new RuntimeException("broker refused to delete the subscription")
                            null
                        case "close"    => closed.set(true); null
                        case "pause"    => null
                        case "equals"   => java.lang.Boolean.valueOf(proxy eq args(0))
                        case "hashCode" => java.lang.Integer.valueOf(label.hashCode)
                        case "toString" => s"proxy-consumer($label)"
                        case _          => null
            Proxy
                .newProxyInstance(getClass.getClassLoader, Array[Class[?]](classOf[Consumer[Array[Byte]]]), handler)
                .asInstanceOf[Consumer[Array[Byte]]]

    private def session(consumer: Consumer[Array[Byte]]): ConsumerSessionRunner =
        val pool = ConsumerSessionContextPool()
        val target = ConsumerSessionTargetRunner(
            targetIndex = 0,
            targetConfig = ConsumerSessionTarget(
                isEnabled = true,
                consumptionMode = ConsumerSessionTargetConsumptionMode(mode = RegularConsumptionMode()),
                messageValueDeserializer = Deserializer(deserializer = UseLatestTopicSchema()),
                topicSelector = TopicSelector(topicSelector = MultiTopicSelector(topicFqns = Vector(topicFqn))),
                messageFilterChain = MessageFilterChain.empty,
                coloringRuleChain = ColoringRuleChain.empty,
                valueProjectionList = ValueProjectionList(isEnabled = false, projections = Vector.empty)
            ),
            nonPartitionedTopicFqns = Vector(topicFqn),
            schemasByTopic = Map.empty,
            sessionContextPool = pool,
            consumers = Map(topicFqn -> consumer),
            pauseArbiters = (Map(topicFqn -> consumer)).map((fqn, c) => fqn -> ConsumerPauseArbiter(c)),
            consumerListener = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = _ => ())),
            stats = ConsumerSessionTargetStats(messageProcessed = AtomicLong(0))
        )
        ConsumerSessionRunner(
            sessionName = sessionName,
            sessionConfig = ConsumerSessionConfig(
                startFrom = EarliestMessage(),
                targets = Vector.empty,
                messageFilterChain = MessageFilterChain.empty,
                coloringRuleChain = ColoringRuleChain.empty,
                pauseTriggerChain = ConsumerSessionPauseTriggerChain.empty,
                valueProjectionList = ValueProjectionList(isEnabled = false, projections = Vector.empty)
            ),
            sessionContextPool = pool,
            grpcResponseObserver = None,
            schemasByTopic = Map.empty,
            targets = Map(0 -> target)
        )

    private def createRequest(name: String = sessionName): consumerPb.CreateConsumerRequest =
        consumerPb.CreateConsumerRequest(consumerName = name, consumerSessionConfig = Some(consumerPb.ConsumerSessionConfig()))

    private def create(service: ConsumerServiceImpl, name: String = sessionName): consumerPb.CreateConsumerResponse =
        Await.result(service.createConsumer(createRequest(name)), Duration(60, SECONDS))

    private def delete(service: ConsumerServiceImpl, name: String = sessionName): consumerPb.DeleteConsumerResponse =
        Await.result(service.deleteConsumer(consumerPb.DeleteConsumerRequest(consumerName = name)), Duration(60, SECONDS))

    private def worker(name: String)(body: => Unit): Thread =
        val t = new Thread((() => body): Runnable, name)
        t.setDaemon(true)
        t

    /** The fresh observer a racing resume brings - what the client's play stream sees. */
    private final class RecordingObserver extends io.grpc.stub.StreamObserver[consumerPb.ResumeResponse]:
        val received = ConcurrentLinkedQueue[consumerPb.ResumeResponse]()
        val completed = AtomicBoolean(false)
        override def onNext(value: consumerPb.ResumeResponse): Unit =
            received.add(value)
            ()
        override def onError(t: Throwable): Unit = ()
        override def onCompleted(): Unit = completed.set(true)

    def spec = suite(this.getClass.toString)(
        test("CREATING OVER AN EXISTING SESSION STOPS IT BEFORE THE REPLACEMENT IS BUILT") {
            // THE ordering defect. Both runners want the same exclusive, non-durable subscription,
            // so building the replacement first meant the predecessor - still live - refused it.
            val events = ConcurrentLinkedQueue[String]()
            val predecessor = RecordingConsumer("old")
            val sessions = new ConcurrentHashMap[ConsumerSessionName, ConsumerSessionRunner]()
            sessions.put(sessionName, session(predecessor.consumer))

            val service = ConsumerServiceImpl(
                sessions,
                (_, _) =>
                    events.add(if predecessor.unsubscribed.get then "built-after-stop" else "built-while-predecessor-live")
                    session(RecordingConsumer("new").consumer)
            )

            val response = create(service)

            assertTrue(
                response.getStatus.code == com.google.rpc.code.Code.OK.value,
                predecessor.unsubscribed.get,
                predecessor.closed.get,
                events.asScala.toVector == Vector("built-after-stop")
            ) ?? s"status=${response.getStatus} events=${events.asScala.toVector}"
        },
        test("TWO CONCURRENT CREATES UNDER ONE NAME NEVER BUILD AT THE SAME TIME") {
            // Nothing serialized them, so two browser tabs (or a retry) could have two runners
            // subscribing to one exclusive subscription at once.
            val inside = AtomicInteger(0)
            val overlaps = AtomicInteger(0)
            val sessions = new ConcurrentHashMap[ConsumerSessionName, ConsumerSessionRunner]()
            val service = ConsumerServiceImpl(
                sessions,
                (_, _) =>
                    if inside.incrementAndGet() > 1 then overlaps.incrementAndGet()
                    // WIDENS the window on purpose: "they did not overlap" must be a claim about
                    // the serialization, not about how fast the two threads happened to run.
                    Thread.sleep(300)
                    inside.decrementAndGet()
                    session(RecordingConsumer("concurrent").consumer)
            )

            val first = worker("create-1")(create(service))
            val second = worker("create-2")(create(service))
            first.start()
            second.start()
            first.join(60_000)
            second.join(60_000)

            assertTrue(overlaps.get == 0, sessions.size == 1) ??
                s"${overlaps.get} concurrent builds under one session name"
        },
        test("A DELETE THAT RACES A CREATE REMOVES ONLY THE SESSION IT ACTUALLY STOPPED") {
            // Delete read runner A, stopped it, then removed the NAME. A create that installed B
            // meanwhile lost it: B stayed running with nothing holding a handle to it, and the
            // browser kept a session the server no longer knew about.
            val gate = CountDownLatch(1)
            val doomed = RecordingConsumer("A", unsubscribeGate = Some(gate))
            val sessions = new ConcurrentHashMap[ConsumerSessionName, ConsumerSessionRunner]()
            sessions.put(sessionName, session(doomed.consumer))
            val service = ConsumerServiceImpl(sessions)

            val deleting = worker("delete-A")(delete(service))
            deleting.start()
            // Wait until delete is committed to stopping A, then install B exactly as a create
            // would. A BARE `put`, deliberately: the per-name lifecycle lock would keep a real
            // create out of this window, and the point here is that the compare-and-remove holds on
            // its own rather than only because of the lock.
            Thread.sleep(300)
            val replacement = session(RecordingConsumer("B").consumer)
            sessions.put(sessionName, replacement)

            gate.countDown()
            deleting.join(60_000)

            assertTrue(sessions.get(sessionName) eq replacement) ??
                s"the delete removed a session it never stopped; left ${Option(sessions.get(sessionName)).map(_ => "something else").getOrElse("nothing")}"
        },
        test("an ordinary create under a fresh name stores exactly one session") {
            val sessions = new ConcurrentHashMap[ConsumerSessionName, ConsumerSessionRunner]()
            val service = ConsumerServiceImpl(sessions, (_, _) => session(RecordingConsumer("fresh").consumer))

            val response = create(service)

            assertTrue(response.getStatus.code == com.google.rpc.code.Code.OK.value, sessions.size == 1)
        },
        test("a create that FAILS to build reports it and leaves no session behind") {
            val sessions = new ConcurrentHashMap[ConsumerSessionName, ConsumerSessionRunner]()
            val service = ConsumerServiceImpl(sessions, (_, _) => throw new IllegalArgumentException("no enabled targets"))

            val response = create(service)

            assertTrue(
                response.getStatus.code == com.google.rpc.code.Code.FAILED_PRECONDITION.value,
                response.getStatus.message.contains("no enabled targets"),
                sessions.isEmpty
            ) ?? s"status=${response.getStatus} sessions=${sessions.size}"
        },
        test("TWO CREATES UNDER DIFFERENT NAMES DO NOT SERIALIZE - the lifecycle lock is per name") {
            // The lifecycle lock is held across the predecessor's stop and the replacement's WHOLE
            // build - subscribing every consumer, seeking it, and for a Latest-N start-from a
            // backward walk of one admin lookup per entry - which is unbounded broker work, not
            // "one broker round trip". The old 64-stripe scheme made two DIFFERENT names share a
            // lock whenever their hashes collided mod 64; these two names collide there by
            // construction, so this test fails against any name-independent striping.
            val nameA = "cs-lifecycle-stripe-a"
            val nameB = (1 to 100_000).view
                .map(i => s"cs-lifecycle-stripe-b$i")
                .find(candidate => math.floorMod(candidate.hashCode, 64) == math.floorMod(nameA.hashCode, 64))
                .get
            val gate = CountDownLatch(1)
            val enteredSlowBuild = CountDownLatch(1)
            val sessions = new ConcurrentHashMap[ConsumerSessionName, ConsumerSessionRunner]()
            val service = ConsumerServiceImpl(
                sessions,
                (name, _) =>
                    if name == nameA then
                        enteredSlowBuild.countDown()
                        gate.await(60, TimeUnit.SECONDS)
                    session(RecordingConsumer(name).consumer)
            )

            val slow = worker("create-slow-name")(create(service, nameA))
            slow.start()
            enteredSlowBuild.await(60, TimeUnit.SECONDS)

            val fast = worker("create-fast-name")(create(service, nameB))
            fast.start()
            fast.join(5_000)
            val fastFinishedWhileSlowHeldItsLock = !fast.isAlive

            gate.countDown()
            slow.join(60_000)
            fast.join(60_000)

            assertTrue(fastFinishedWhileSlowHeldItsLock, sessions.size == 2) ??
                s"create($nameB) sat behind create($nameA)'s broker work despite the different name"
        },
        test("A RESUME THAT RACES A DELETE WAITS FOR IT AND IS TOLD THE SESSION IS GONE") {
            // Unserialized, resume read the runner mid-delete and wired the fresh observer into a
            // runner whose stop was already in flight; the stop then completed the stream with no
            // status frame, and the client's play stream hung silent forever with nothing to show
            // and nothing to say.
            val gate = CountDownLatch(1)
            val doomed = RecordingConsumer("doomed", unsubscribeGate = Some(gate))
            val sessions = new ConcurrentHashMap[ConsumerSessionName, ConsumerSessionRunner]()
            sessions.put(sessionName, session(doomed.consumer))
            val service = ConsumerServiceImpl(sessions)
            val observer = RecordingObserver()

            val deleting = worker("delete-racing")(delete(service))
            deleting.start()
            doomed.unsubscribeEntered.await(60, TimeUnit.SECONDS)

            val resuming = worker("resume-racing")(
                service.resume(consumerPb.ResumeRequest(consumerName = sessionName, includeConsumerStats = true), observer)
            )
            resuming.start()
            resuming.join(1_500)
            val resumeWaitedForTheDelete = resuming.isAlive

            gate.countDown()
            deleting.join(60_000)
            resuming.join(60_000)

            val statuses = observer.received.asScala.toVector.flatMap(_.status).map(_.code)
            assertTrue(
                resumeWaitedForTheDelete,
                statuses == Vector(com.google.rpc.code.Code.FAILED_PRECONDITION.value),
                observer.completed.get
            ) ?? s"waitedForDelete=$resumeWaitedForTheDelete statuses=$statuses completed=${observer.completed.get}"
        },
        test("REPLACING A SESSION LOGS A PREDECESSOR THAT COULD NOT BE RELEASED, as its comment promises") {
            // `storeConsumerSession`'s scaladoc says the stop failure "is logged" - but
            // `Try(replaced.stop())` discarded it, so a predecessor that failed to release
            // disappeared without a trace in exactly the situation an operator needs the trace.
            val appender = new ch.qos.logback.core.read.ListAppender[ch.qos.logback.classic.spi.ILoggingEvent]()
            appender.start()
            val logbackLogger = org.slf4j.LoggerFactory
                .getLogger("consumer.session_runner.storeConsumerSession")
                .asInstanceOf[ch.qos.logback.classic.Logger]
            logbackLogger.addAppender(appender)
            try
                val stubborn = RecordingConsumer("stubborn", unsubscribeFails = true)
                val sessions = new ConcurrentHashMap[ConsumerSessionName, ConsumerSessionRunner]()
                sessions.put(sessionName, session(stubborn.consumer))

                storeConsumerSession(sessions, sessionName, session(RecordingConsumer("replacement").consumer))

                val warned = appender.list.asScala.toVector.map(_.getFormattedMessage)
                assertTrue(warned.exists(m => m.contains(sessionName) && m.contains("could not be fully released"))) ??
                    s"the replaced runner's stop failure was logged nowhere; logged=$warned"
            finally logbackLogger.detachAppender(appender)
        }
    ) @@ TestAspect.sequential
