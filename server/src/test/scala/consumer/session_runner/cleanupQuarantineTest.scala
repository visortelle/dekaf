package consumer.session_runner

import _root_.consumer.coloring_rules.ColoringRuleChain
import _root_.consumer.deserializer.Deserializer
import _root_.consumer.deserializer.deserializers.UseLatestTopicSchema
import _root_.consumer.message_filter.MessageFilterChain
import _root_.consumer.session_target.ConsumerSessionTarget
import _root_.consumer.session_target.consumption_mode.ConsumerSessionTargetConsumptionMode
import _root_.consumer.session_target.consumption_mode.modes.RegularConsumptionMode
import _root_.consumer.session_target.topic_selector.{MultiTopicSelector, TopicSelector}
import _root_.consumer.value_projections.ValueProjectionList
import org.apache.pulsar.client.api.Consumer
import zio.test.*

import java.lang.reflect.{InvocationHandler, Method, Proxy}
import java.util.concurrent.CompletableFuture
import java.util.concurrent.atomic.{AtomicInteger, AtomicLong}

/** A RELEASE THAT FAILED IS NOT A RELEASE, AND THE HANDLE IS THE ONLY WAY BACK TO IT.
  *
  * Both cleanup paths used to answer as though a failed release had happened: the partial-build
  * unwind swallowed the failure whole, and a target's stop cleared its consumer map whatever
  * unsubscribe and close did. A consumer that was mid-reconnect at that instant - the ordinary
  * reason either call fails - then kept its subscription, its connection and its listener thread
  * for the life of the process, with nothing left holding a reference to close it.
  *
  * Nothing here needs a broker: the consumer is a proxy that fails a set number of times.
  */
object cleanupQuarantineTest extends ZIOSpecDefault:

    private val topicA = "persistent://public/default/cs-cleanup-a"
    private val topicB = "persistent://public/default/cs-cleanup-b"

    /** A consumer whose `unsubscribe` and `close` fail the first `failures` times each - a client
      * mid-reconnect, which is exactly when a session is most likely to be stopped. */
    private final class FlakyConsumer(topicFqn: String, failures: Int):
        val unsubscribeCalls = AtomicInteger(0)
        val closeCalls = AtomicInteger(0)
        private val unsubscribesToFail = AtomicInteger(failures)
        private val closesToFail = AtomicInteger(failures)

        val consumer: Consumer[Array[Byte]] =
            val handler = new InvocationHandler:
                override def invoke(proxy: Object, method: Method, args: Array[Object]): Object =
                    method.getName match
                        case "getTopic"        => topicFqn
                        case "getConsumerName" => "cs-cleanup-0"
                        case "isConnected"     => java.lang.Boolean.TRUE
                        case "unsubscribe" =>
                            unsubscribeCalls.incrementAndGet()
                            if unsubscribesToFail.getAndUpdate(n => math.max(0, n - 1)) > 0 then
                                throw new IllegalStateException(s"$topicFqn is reconnecting and cannot unsubscribe")
                            null
                        case "close" =>
                            closeCalls.incrementAndGet()
                            if closesToFail.getAndUpdate(n => math.max(0, n - 1)) > 0 then
                                throw new IllegalStateException(s"$topicFqn is reconnecting and cannot close")
                            null
                        case "pause"               => null
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

    private def targetRunner(consumers: Map[String, Consumer[Array[Byte]]]): ConsumerSessionTargetRunner =
        val listener = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = _ => ()))
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
            consumerListener = listener,
            stats = ConsumerSessionTargetStats(messageProcessed = AtomicLong(0))
        )

    def spec = suite("failed cleanup stays addressable and is retried")(
        test("P2.2: a consumer that could not be released is retried until it IS released") {
            // The broker refuses once - the client is reconnecting - and the session is then
            // discarded. Nothing but a retained handle can ever close that consumer afterwards.
            val flaky = FlakyConsumer(topicA, failures = 1)
            val quarantine = CleanupQuarantine()
            val target = targetRunner(Map(topicA -> flaky.consumer))

            val firstFailures = target.stop(quarantine)
            val quarantinedAfterStop = quarantine.pendingLabels

            val stillFailing = quarantine.retryPending()

            assertTrue(
                firstFailures.nonEmpty, // vacuity guard: the release really did fail
                quarantinedAfterStop.exists(_.contains(topicA)), // the handle was RETAINED, not discarded
                stillFailing.isEmpty, // ...and the retry released it
                quarantine.pendingLabels.isEmpty,
                flaky.unsubscribeCalls.get == 2,
                flaky.closeCalls.get == 2
            ) ?? (s"failures=$firstFailures quarantined=$quarantinedAfterStop stillFailing=$stillFailing " +
                s"unsubscribes=${flaky.unsubscribeCalls.get} closes=${flaky.closeCalls.get}")
        },
        test("P2.2: a consumer that released cleanly is not quarantined, and its peer's failure does not hold it") {
            val ok = FlakyConsumer(topicA, failures = 0)
            val flaky = FlakyConsumer(topicB, failures = 1)
            val quarantine = CleanupQuarantine()
            val target = targetRunner(Map(topicA -> ok.consumer, topicB -> flaky.consumer))

            target.stop(quarantine)

            assertTrue(
                quarantine.pendingLabels.size == 1,
                quarantine.pendingLabels.exists(_.contains(topicB)),
                !quarantine.pendingLabels.exists(_.contains(topicA))
            ) ?? s"quarantined=${quarantine.pendingLabels}"
        },
        test("P2.2: a release that keeps failing stays quarantined rather than being forgotten") {
            val flaky = FlakyConsumer(topicA, failures = 5)
            val quarantine = CleanupQuarantine()
            val target = targetRunner(Map(topicA -> flaky.consumer))

            target.stop(quarantine)
            val afterOneRetry = quarantine.retryPending()

            assertTrue(afterOneRetry.size == 1, quarantine.pendingLabels.size == 1) ??
                s"stillFailing=$afterOneRetry pending=${quarantine.pendingLabels}"
        },
        test("P2.2: the quarantine is BOUNDED - a server that can never release drops the oldest, not the heap") {
            val quarantine = CleanupQuarantine(capacity = 3)
            (1 to 10).foreach(i => quarantine.quarantine(s"resource-$i", () => throw new IllegalStateException("never")))
            assertTrue(
                quarantine.pendingLabels.size == 3,
                quarantine.pendingLabels == Vector("resource-8", "resource-9", "resource-10")
            ) ?? s"pending=${quarantine.pendingLabels}"
        },
        test("P2.2: the same resource is not quarantined twice by a repeated stop") {
            val flaky = FlakyConsumer(topicA, failures = 5)
            val quarantine = CleanupQuarantine()
            val target = targetRunner(Map(topicA -> flaky.consumer))

            target.stop(quarantine)
            target.stop(quarantine)

            assertTrue(quarantine.pendingLabels.size == 1) ?? s"pending=${quarantine.pendingLabels}"
        },
        test("P2.2: a partial build hands back what it could NOT release, and says why on the original failure") {
            // `buildAllOrRelease` swallowed release failures outright: the original error propagated
            // with no trace of the resources it had left behind, and nothing held them.
            val released = scala.collection.mutable.ArrayBuffer[String]()
            val stranded = scala.collection.mutable.ArrayBuffer[(String, String)]()

            val err = scala.util.Try(
                buildAllOrRelease[String, String](
                    inputs = Vector("a", "b", "boom"),
                    build = input => if input == "boom" then throw new RuntimeException("could not subscribe") else input,
                    release = resource =>
                        if resource == "b" then throw new IllegalStateException(s"$resource is reconnecting")
                        released += resource
                        ()
                    ,
                    onReleaseFailure = (resource, cause) => { stranded += ((resource, cause.getMessage)); () }
                )
            ).failed.get

            assertTrue(
                err.getMessage == "could not subscribe", // the CAUSE still propagates, not a consequence
                released.toVector == Vector("a"),
                stranded.toVector.map(_._1) == Vector("b"), // the handle reached the caller
                err.getSuppressed.toVector.map(_.getMessage) == Vector("b is reconnecting")
            ) ?? s"released=$released stranded=$stranded suppressed=${err.getSuppressed.toVector.map(_.getMessage)}"
        }
    )
