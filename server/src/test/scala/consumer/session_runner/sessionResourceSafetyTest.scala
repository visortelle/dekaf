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
import com.tools.teal.pulsar.ui.api.v1.consumer as consumerPb
import org.apache.pulsar.client.api.Consumer
import zio.test.*

import java.lang.reflect.{InvocationHandler, Method, Proxy}
import java.util.concurrent.atomic.{AtomicBoolean, AtomicLong}
import java.util.concurrent.ConcurrentLinkedQueue
import scala.jdk.CollectionConverters.*
import scala.util.Try

/** A CONSUMER SESSION OWNS BROKER RESOURCES, and every path that stops owning them has to release
  * them.
  *
  * A session holds one Pulsar consumer per physical topic (each with a live subscription and its own
  * listener thread) and one GraalVM engine with its JS contexts. Four paths used to drop the handle
  * without releasing anything:
  *
  *   - a target subscribing to several topics built them in a plain `map`, so a failure on the third
  *     topic left the first two subscribed and unreachable - the partly-built runner was never
  *     returned, so nothing could close them;
  *   - the same one level up: a session builds one runner per enabled target;
  *   - creating a session under a name that already existed simply overwrote the old runner, whose
  *     consumers went on consuming for the life of the process;
  *   - stopping swallowed unsubscribe failures and never closed the consumers, the Graal contexts or
  *     the client's response stream at all.
  *
  * The broker sits behind plain functions and proxy consumers, so all of it runs offline.
  */
object sessionResourceSafetyTest extends ZIOSpecDefault:

    private val topicA = "persistent://public/default/res-a"
    private val topicB = "persistent://public/default/res-b"

    private val buildSuite = suite("building a set of resources, all or nothing")(
        test("a failure part-way through RELEASES everything already built") {
            // THE leak. Three subscriptions, the third refused: without this the first two stayed
            // subscribed with nothing holding a handle to them.
            val released = ConcurrentLinkedQueue[String]()
            val result = Try(buildAllOrRelease[String, String](
                inputs = Vector("a", "b", "boom"),
                build = input => if input == "boom" then throw new RuntimeException("broker refused") else s"consumer-$input",
                release = released.add(_)
            ))
            assertTrue(
                result.isFailure,
                result.failed.toOption.exists(_.getMessage.contains("broker refused")),
                released.asScala.toVector == Vector("consumer-a", "consumer-b")
            ) ?? s"result=$result released=${released.asScala.toVector}"
        },
        test("the ORIGINAL failure propagates, not one thrown while cleaning up") {
            // Cleaning up is second-chance work: a close that fails on the way out must not replace
            // the cause of the failure with a consequence of it.
            val released = ConcurrentLinkedQueue[String]()
            val result = Try(buildAllOrRelease[String, String](
                inputs = Vector("a", "b", "boom"),
                build = input => if input == "boom" then throw new RuntimeException("broker refused") else s"consumer-$input",
                release = resource =>
                    released.add(resource)
                    throw new IllegalStateException("close also failed")
            ))
            assertTrue(
                result.failed.toOption.exists(_.getMessage.contains("broker refused")),
                released.asScala.toVector == Vector("consumer-a", "consumer-b")
            ) ?? s"result=$result released=${released.asScala.toVector}"
        },
        test("nothing is released when everything builds") {
            val released = ConcurrentLinkedQueue[String]()
            val built = buildAllOrRelease[String, String](Vector("a", "b"), input => s"consumer-$input", released.add(_))
            assertTrue(built == Vector("consumer-a", "consumer-b"), released.asScala.toVector.isEmpty)
        },
        test("the very first failing resource releases nothing and still fails") {
            val released = ConcurrentLinkedQueue[String]()
            val result = Try(buildAllOrRelease[String, String](Vector("boom"), _ => throw new RuntimeException("no"), released.add(_)))
            assertTrue(result.isFailure, released.asScala.toVector.isEmpty)
        }
    )

    /** A consumer that records what was done to it, and can refuse to unsubscribe or to close. */
    private final class RecordingConsumer(topicFqn: String, unsubscribeFails: Boolean = false, closeFails: Boolean = false):
        val unsubscribed = AtomicBoolean(false)
        val closed = AtomicBoolean(false)
        val paused = AtomicBoolean(false)

        val consumer: Consumer[Array[Byte]] =
            val handler = new InvocationHandler:
                override def invoke(proxy: Object, method: Method, args: Array[Object]): Object =
                    method.getName match
                        case "getTopic" => topicFqn
                        case "unsubscribe" =>
                            unsubscribed.set(true)
                            if unsubscribeFails then throw new RuntimeException(s"cannot unsubscribe from $topicFqn")
                            null
                        case "close" =>
                            closed.set(true)
                            if closeFails then throw new RuntimeException(s"cannot close the consumer for $topicFqn")
                            null
                        case "pause"    => paused.set(true); null
                        case "equals"   => java.lang.Boolean.valueOf(proxy eq args(0))
                        case "hashCode" => java.lang.Integer.valueOf(topicFqn.hashCode)
                        case "toString" => s"proxy-consumer($topicFqn)"
                        case _          => null
            Proxy
                .newProxyInstance(getClass.getClassLoader, Array[Class[?]](classOf[Consumer[Array[Byte]]]), handler)
                .asInstanceOf[Consumer[Array[Byte]]]

    private def targetRunner(pool: ConsumerSessionContextPool, consumers: Map[String, Consumer[Array[Byte]]]): ConsumerSessionTargetRunner =
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
            sessionContextPool = pool,
            consumers = consumers,
            pauseArbiters = (consumers).map((fqn, c) => fqn -> ConsumerPauseArbiter(c)),
            consumerListener = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = _ => ())),
            stats = ConsumerSessionTargetStats(messageProcessed = AtomicLong(0))
        )

    private def session(
        sessionName: String,
        pool: ConsumerSessionContextPool,
        consumers: Map[String, Consumer[Array[Byte]]]
    ): ConsumerSessionRunner =
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
            targets = Map(0 -> targetRunner(pool, consumers))
        )

    private final class RecordingObserver extends io.grpc.stub.StreamObserver[consumerPb.ResumeResponse]:
        val completed = AtomicBoolean(false)
        override def onNext(value: consumerPb.ResumeResponse): Unit = ()
        override def onError(t: Throwable): Unit = ()
        override def onCompleted(): Unit = completed.set(true)

    private val stopSuite = suite("stopping a session releases what it holds")(
        test("a consumer is CLOSED and not merely unsubscribed") {
            // Unsubscribing deletes the subscription; the consumer object, its connection and its
            // listener thread are only released by closing it. Stopping did the first and not the
            // second, so every session ever stopped leaked its consumers.
            val pool = ConsumerSessionContextPool()
            val a = RecordingConsumer(topicA)
            val runner = session("cs-stop", pool, Map(topicA -> a.consumer))

            runner.stop()

            assertTrue(a.unsubscribed.get, a.closed.get) ??
                s"unsubscribed=${a.unsubscribed.get} closed=${a.closed.get}"
        },
        test("a consumer that refuses to unsubscribe is still CLOSED, and the failure is reported") {
            // Reported, because deleting the session used to answer OK while the subscription it
            // failed to delete stayed on the broker; closed, because a failed unsubscribe must not
            // strand the consumer as well.
            val pool = ConsumerSessionContextPool()
            val a = RecordingConsumer(topicA, unsubscribeFails = true)
            val b = RecordingConsumer(topicB)
            val runner = session("cs-stop-fail", pool, Map(topicA -> a.consumer, topicB -> b.consumer))

            val result = Try(runner.stop())

            assertTrue(
                result.isFailure,
                result.failed.toOption.exists(_.getMessage.contains(topicA)),
                a.closed.get,
                // The other consumer must not be stranded by its neighbour's failure.
                b.unsubscribed.get,
                b.closed.get
            ) ?? s"result=$result aClosed=${a.closed.get} bUnsubscribed=${b.unsubscribed.get} bClosed=${b.closed.get}"
        },
        test("the session's GraalVM contexts are closed") {
            // One engine and one JS context per session, held for the session's whole life. Nothing
            // closed them, so every session ever created leaked a Graal context.
            val pool = ConsumerSessionContextPool()
            val runner = session("cs-stop-graal", pool, Map(topicA -> RecordingConsumer(topicA).consumer))
            val stillUsable = Try(pool.getContext(0).context.eval("js", "1 + 1")).isSuccess

            runner.stop()

            assertTrue(stillUsable, Try(pool.getContext(0).context.eval("js", "1 + 1")).isFailure) ??
                "the session's JS context was still open after the session was stopped"
        },
        test("A CONSUMER THAT REFUSES TO CLOSE IS REPORTED, not silently left running") {
            // The close was wrapped in a bare `Try` whose result was discarded, so a consumer still
            // connected and still holding its listener thread was invisible: `deleteConsumer`
            // answered OK with the consumer very much alive.
            val pool = ConsumerSessionContextPool()
            val stubborn = RecordingConsumer(topicA, closeFails = true)
            val runner = session("cs-stop-close-fail", pool, Map(topicA -> stubborn.consumer))

            val result = Try(runner.stop())

            assertTrue(
                result.isFailure,
                result.failed.toOption.exists(_.getMessage.contains(topicA)),
                result.failed.toOption.exists(_.getMessage.toLowerCase.contains("close")),
                // Unsubscribing still happened - the failure is the close, and only the close.
                stubborn.unsubscribed.get
            ) ?? s"result=$result"
        },
        test("a consumer that refuses BOTH reports both failures") {
            val pool = ConsumerSessionContextPool()
            val stubborn = RecordingConsumer(topicA, unsubscribeFails = true, closeFails = true)
            val runner = session("cs-stop-both-fail", pool, Map(topicA -> stubborn.consumer))

            val message = Try(runner.stop()).failed.toOption.map(_.getMessage).getOrElse("")

            assertTrue(message.toLowerCase.contains("unsubscribe"), message.toLowerCase.contains("close")) ?? s"message=$message"
        },
        test("the client's response stream is completed") {
            // The stored observer was left open: the browser kept a stream to a session that no
            // longer exists and was never told it had ended.
            val pool = ConsumerSessionContextPool()
            val runner = session("cs-stop-observer", pool, Map(topicA -> RecordingConsumer(topicA).consumer))
            val observer = RecordingObserver()
            runner.resume(observer, isDebug = false)

            runner.stop()

            assertTrue(observer.completed.get)
        }
    )

    private val replaceSuite = suite("creating a session over one that already exists")(
        test("the session it REPLACES is stopped, not abandoned") {
            // Creating twice under one name (the browser re-creating on a config change) used to
            // overwrite the entry. The old runner's consumers stayed subscribed and delivering, with
            // nothing left holding a handle to them.
            val sessions = new java.util.concurrent.ConcurrentHashMap[String, ConsumerSessionRunner]()
            val oldConsumer = RecordingConsumer(topicA)
            val oldPool = ConsumerSessionContextPool()
            val newConsumer = RecordingConsumer(topicA)
            val replacement = session("cs-dup", ConsumerSessionContextPool(), Map(topicA -> newConsumer.consumer))

            storeConsumerSession(sessions, "cs-dup", session("cs-dup", oldPool, Map(topicA -> oldConsumer.consumer)))
            storeConsumerSession(sessions, "cs-dup", replacement)

            assertTrue(
                oldConsumer.unsubscribed.get,
                oldConsumer.closed.get,
                !newConsumer.closed.get,
                sessions.get("cs-dup") eq replacement
            ) ?? s"oldClosed=${oldConsumer.closed.get} newClosed=${newConsumer.closed.get}"
        },
        test("a first create under a fresh name stops nothing") {
            val sessions = new java.util.concurrent.ConcurrentHashMap[String, ConsumerSessionRunner]()
            val consumer = RecordingConsumer(topicA)
            val runner = session("cs-fresh", ConsumerSessionContextPool(), Map(topicA -> consumer.consumer))

            storeConsumerSession(sessions, "cs-fresh", runner)

            assertTrue(!consumer.closed.get, sessions.get("cs-fresh") eq runner)
        },
        test("a replaced session that fails to stop is still replaced") {
            // Otherwise one undeletable subscription would make the name permanently unusable.
            val sessions = new java.util.concurrent.ConcurrentHashMap[String, ConsumerSessionRunner]()
            val stubborn = RecordingConsumer(topicA, unsubscribeFails = true)
            val replacement = session("cs-dup-fail", ConsumerSessionContextPool(), Map(topicB -> RecordingConsumer(topicB).consumer))

            storeConsumerSession(sessions, "cs-dup-fail", session("cs-dup-fail", ConsumerSessionContextPool(), Map(topicA -> stubborn.consumer)))
            val result = Try(storeConsumerSession(sessions, "cs-dup-fail", replacement))

            assertTrue(result.isSuccess, stubborn.closed.get, sessions.get("cs-dup-fail") eq replacement)
        }
    )

    /** A pool that refuses to give its contexts up. Subclassed rather than mocked, so the real
      * aggregation path in `ConsumerSessionRunner.stop` is the thing under test. */
    private final class RefusingPool extends ConsumerSessionContextPool(isDebug = false):
        override def close(): Vector[String] = Vector("JS context 0: still executing on another thread")

    /** Real clients aimed at a closed port, so a construction failure is a real broker failure
      * rather than a mock's idea of one. */
    private def withOfflineClients[A](f: (org.apache.pulsar.client.api.PulsarClient, org.apache.pulsar.client.admin.PulsarAdmin) => A): A =
        val client = org.apache.pulsar.client.api.PulsarClient.builder
            .serviceUrl("pulsar://127.0.0.1:1")
            .operationTimeout(2, java.util.concurrent.TimeUnit.SECONDS)
            .build
        val admin = org.apache.pulsar.client.admin.PulsarAdmin.builder
            .serviceHttpUrl("http://127.0.0.1:1")
            .connectionTimeout(2, java.util.concurrent.TimeUnit.SECONDS)
            .readTimeout(2, java.util.concurrent.TimeUnit.SECONDS)
            .requestTimeout(2, java.util.concurrent.TimeUnit.SECONDS)
            .build
        try f(client, admin)
        finally
            Try(client.close())
            Try(admin.close())

    private val oneEnabledTarget = ConsumerSessionConfig(
        startFrom = EarliestMessage(),
        targets = Vector(ConsumerSessionTarget(
            isEnabled = true,
            consumptionMode = ConsumerSessionTargetConsumptionMode(mode = RegularConsumptionMode()),
            messageValueDeserializer = Deserializer(deserializer = UseLatestTopicSchema()),
            topicSelector = TopicSelector(topicSelector = MultiTopicSelector(topicFqns = Vector(topicA))),
            messageFilterChain = MessageFilterChain.empty,
            coloringRuleChain = ColoringRuleChain.empty,
            valueProjectionList = ValueProjectionList(isEnabled = false, projections = Vector.empty)
        )),
        messageFilterChain = MessageFilterChain.empty,
        coloringRuleChain = ColoringRuleChain.empty,
        pauseTriggerChain = ConsumerSessionPauseTriggerChain.empty,
        valueProjectionList = ValueProjectionList(isEnabled = false, projections = Vector.empty)
    )

    private def poolIsClosed(pool: ConsumerSessionContextPool): Boolean =
        Try(pool.getContext(0).context.eval("js", "1 + 1")).isFailure

    private val constructionSuite = suite("a session that cannot be built releases what it had already taken")(
        test("A TARGET THAT FAILS TO BUILD CLOSES THE SESSION'S GRAAL POOL") {
            // The pool is the FIRST thing a session takes and was created outside the all-or-nothing
            // guard, so a target that failed to resolve its topics released the targets built before
            // it and left a whole GraalVM engine open with nothing holding a handle to it. The
            // browser retries a failed create, so this leaked an engine per attempt.
            val pool = ConsumerSessionContextPool()
            val usableBefore = !poolIsClosed(pool)

            val result = withOfflineClients((client, admin) =>
                Try(ConsumerSessionRunner.make(
                    pulsarClient = client,
                    adminClient = admin,
                    sessionName = "cs-build-fail",
                    sessionConfig = oneEnabledTarget,
                    sessionContextPool = pool
                ))
            )

            assertTrue(usableBefore, result.isFailure, poolIsClosed(pool)) ??
                s"result=$result poolClosed=${poolIsClosed(pool)}"
        },
        test("a session with no enabled targets closes the pool as well") {
            val pool = ConsumerSessionContextPool()
            val result = withOfflineClients((client, admin) =>
                Try(ConsumerSessionRunner.make(
                    pulsarClient = client,
                    adminClient = admin,
                    sessionName = "cs-no-targets",
                    sessionConfig = oneEnabledTarget.copy(targets = Vector.empty),
                    sessionContextPool = pool
                ))
            )
            assertTrue(result.isFailure, poolIsClosed(pool))
        }
    )

    private val aggregationSuite = suite("stopping reports everything it could not release")(
        test("A GRAAL POOL THAT WILL NOT CLOSE IS REPORTED, not swallowed twice over") {
            // Swallowed once inside `close` and then discarded again by the caller, so a JS context
            // holding its heap for the life of the process was reported to the client as released.
            val runner = session("cs-stop-pool-fail", RefusingPool(), Map(topicA -> RecordingConsumer(topicA).consumer))

            val result = Try(runner.stop())

            assertTrue(
                result.isFailure,
                result.failed.toOption.exists(_.getMessage.contains("JS context 0"))
            ) ?? s"result=$result"
        },
        test("an UNEXPECTED throw out of a target's stop is a failure, not an empty result") {
            // `Try(target.stop()).getOrElse(Vector.empty)` read "this target blew up" as "this
            // target released everything cleanly".
            val pool = ConsumerSessionContextPool()
            val exploding = new ConsumerSessionTargetRunner(
                targetIndex = 7,
                targetConfig = ConsumerSessionTarget(
                    isEnabled = true,
                    consumptionMode = ConsumerSessionTargetConsumptionMode(mode = RegularConsumptionMode()),
                    messageValueDeserializer = Deserializer(deserializer = UseLatestTopicSchema()),
                    topicSelector = TopicSelector(topicSelector = MultiTopicSelector(topicFqns = Vector(topicA))),
                    messageFilterChain = MessageFilterChain.empty,
                    coloringRuleChain = ColoringRuleChain.empty,
                    valueProjectionList = ValueProjectionList(isEnabled = false, projections = Vector.empty)
                ),
                nonPartitionedTopicFqns = Vector(topicA),
                schemasByTopic = Map.empty,
                sessionContextPool = pool,
                consumers = Map.empty,
                pauseArbiters = Map.empty,
                consumerListener = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = _ => ())),
                stats = ConsumerSessionTargetStats(messageProcessed = AtomicLong(0))
            ):
                override def stop(quarantine: CleanupQuarantine): Vector[String] =
                    throw new IllegalStateException("the target could not be released at all")

            val runner = session("cs-stop-target-throws", pool, Map.empty).copy(targets = Map(7 -> exploding))

            val result = Try(runner.stop())

            assertTrue(
                result.isFailure,
                result.failed.toOption.exists(_.getMessage.contains("could not be released at all")),
                result.failed.toOption.exists(_.getMessage.contains("target 7"))
            ) ?? s"result=$result"
        }
    )

    def spec =
        suite(this.getClass.toString)(buildSuite, stopSuite, replaceSuite, constructionSuite, aggregationSuite) @@ TestAspect.sequential
