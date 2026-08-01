package consumer.session_runner

import _root_.consumer.coloring_rules.ColoringRuleChain
import _root_.consumer.deserializer.Deserializer
import _root_.consumer.deserializer.deserializers.TreatBytesAsJson
import _root_.consumer.message_filter.basic_message_filter.targets.{BasicMessageFilterTarget, BasicMessageFilterValueTarget}
import _root_.consumer.message_filter.{JsMessageFilter, MessageFilter, MessageFilterChain, MessageFilterChainMode}
import _root_.consumer.pause_trigger.ConsumerSessionPauseTriggerChain
import _root_.consumer.session_config.ConsumerSessionConfig
import _root_.consumer.session_target.ConsumerSessionTarget
import _root_.consumer.session_target.consumption_mode.ConsumerSessionTargetConsumptionMode
import _root_.consumer.session_target.consumption_mode.modes.RegularConsumptionMode
import _root_.consumer.session_target.topic_selector.{MultiTopicSelector, TopicSelector}
import _root_.consumer.start_from.EarliestMessage
import _root_.consumer.value_projections.ValueProjectionList
import com.tools.teal.pulsar.ui.api.v1.consumer as consumerPb
import org.apache.pulsar.client.api.{Consumer, Message as PulsarMessage, Schema}
import org.apache.pulsar.client.impl.{MessageIdImpl, MessageImpl}
import org.apache.pulsar.common.api.proto.MessageMetadata
import zio.test.*

import java.lang.reflect.{InvocationHandler, Method, Proxy}
import java.nio.ByteBuffer
import java.util.concurrent.atomic.AtomicLong
import java.util.concurrent.{CompletableFuture, ConcurrentLinkedQueue}
import scala.jdk.CollectionConverters.*

/** THE DELIVERY BUDGET'S ONE CONTRACT: "pause after n" means EXACTLY n LOADED - counted at the
  * send, after every filter - while processed is free to run ahead.
  *
  * A client-side threshold can only ever be approximate: a whole chunk lands before the client can
  * react, and under a rate limit the first chunk is the full one-second burst - "pause after 10"
  * showed a hundred. This suite drives the REAL pipeline (real listener, real GraalVM filter
  * chain, real runner send path; only the broker and the wire are replaced) and pins that the
  * message spending the last budget unit is the last one sent, that everything behind it survives
  * for the next resume, and that a filter dropping most messages makes processed exceed loaded
  * without disturbing the loaded count's exactness.
  */
object deliveryBudgetTest extends ZIOSpecDefault:

    private val consumerName = "cs-delivery-budget"
    private val p0 = "persistent://public/default/delivery-budget-0"

    private final class RecordingConsumer(topicFqn: String):
        val acknowledged = ConcurrentLinkedQueue[String]()

        val consumer: Consumer[Array[Byte]] =
            val handler = new InvocationHandler:
                override def invoke(proxy: Object, method: Method, args: Array[Object]): Object =
                    method.getName match
                        case "getTopic"        => topicFqn
                        case "getConsumerName" => consumerName
                        case "isConnected"     => java.lang.Boolean.TRUE
                        case "pause" | "resume" => null
                        case "acknowledgeAsync" =>
                            acknowledged.add(args(0).asInstanceOf[PulsarMessage[Array[Byte]]].getKey)
                            CompletableFuture.completedFuture(null)
                        case "negativeAcknowledge" => null
                        case "equals"              => java.lang.Boolean.valueOf(proxy eq args(0))
                        case "hashCode"            => java.lang.Integer.valueOf(topicFqn.hashCode)
                        case "toString"            => s"proxy-consumer($topicFqn)"
                        case _                     => null
            Proxy
                .newProxyInstance(getClass.getClassLoader, Array[Class[?]](classOf[Consumer[Array[Byte]]]), handler)
                .asInstanceOf[Consumer[Array[Byte]]]

    private def message(n: Int): MessageImpl[Array[Byte]] =
        val md = new MessageMetadata()
        md.setPublishTime(1_700_000_000_000L + n)
        md.setPartitionKey(n.toString)
        val msg = MessageImpl.create[Array[Byte]](md, ByteBuffer.wrap(s"""{"n":$n}""".getBytes("UTF-8")), Schema.BYTES, p0)
        msg.setMessageId(new MessageIdImpl(1L, n.toLong, -1))
        msg

    /** Session-level filter keeping only even `n`: every message is PROCESSED, half are LOADED. */
    private val evenOnly: MessageFilterChain =
        MessageFilterChain(
            isEnabled = true,
            isNegated = false,
            mode = MessageFilterChainMode.All,
            filters = Vector(
                MessageFilter(
                    isEnabled = true,
                    isNegated = false,
                    targetField = BasicMessageFilterTarget(target = BasicMessageFilterValueTarget()),
                    filter = JsMessageFilter(jsCode = "v => v.n % 2 === 0")
                )
            )
        )

    private def targetRunner(consumerListener: ConsumerListener, consumers: Map[String, Consumer[Array[Byte]]]): ConsumerSessionTargetRunner =
        ConsumerSessionTargetRunner(
            targetIndex = 0,
            targetConfig = ConsumerSessionTarget(
                isEnabled = true,
                consumptionMode = ConsumerSessionTargetConsumptionMode(mode = RegularConsumptionMode()),
                messageValueDeserializer = Deserializer(deserializer = TreatBytesAsJson()),
                topicSelector = TopicSelector(topicSelector = MultiTopicSelector(topicFqns = Vector(p0))),
                messageFilterChain = MessageFilterChain.empty,
                coloringRuleChain = ColoringRuleChain.empty,
                valueProjectionList = ValueProjectionList(isEnabled = false, projections = Vector.empty)
            ),
            nonPartitionedTopicFqns = Vector(p0),
            schemasByTopic = Map.empty,
            sessionContextPool = ConsumerSessionContextPool(),
            consumers = consumers,
            consumerListener = consumerListener,
            stats = ConsumerSessionTargetStats(messageProcessed = AtomicLong(0))
        )

    private def session(target: ConsumerSessionTargetRunner, sessionFilter: MessageFilterChain): ConsumerSessionRunner =
        ConsumerSessionRunner(
            sessionName = consumerName,
            sessionConfig = ConsumerSessionConfig(
                startFrom = EarliestMessage(),
                targets = Vector.empty,
                messageFilterChain = sessionFilter,
                coloringRuleChain = ColoringRuleChain.empty,
                pauseTriggerChain = ConsumerSessionPauseTriggerChain.empty,
                valueProjectionList = ValueProjectionList(isEnabled = false, projections = Vector.empty)
            ),
            sessionContextPool = ConsumerSessionContextPool(),
            grpcResponseObserver = None,
            schemasByTopic = Map.empty,
            targets = Map(0 -> target)
        )

    /** Collects what actually went on the wire. Thread-safe: the drain thread writes it. */
    private final class CollectingObserver extends io.grpc.stub.StreamObserver[consumerPb.ResumeResponse]:
        val loadedValues = ConcurrentLinkedQueue[String]()
        override def onNext(value: consumerPb.ResumeResponse): Unit =
            value.messages.filter(_.value.isDefined).foreach(m => loadedValues.add(m.value.get))
            ()
        override def onError(t: Throwable): Unit = ()
        override def onCompleted(): Unit = ()

    /** Spin until `condition` holds and keeps holding for 200ms, or the deadline passes - the
      * drain runs on the runner's real timer thread, so the test has to meet it in real time. */
    private def awaitStable(deadlineMs: Long = 10_000)(condition: => Boolean): Boolean =
        val start = System.nanoTime()
        var stableSince = -1L
        var done = false
        while !done && (System.nanoTime() - start) / 1_000_000 < deadlineMs do
            if condition then
                if stableSince < 0 then stableSince = System.nanoTime()
                else if (System.nanoTime() - stableSince) / 1_000_000 >= 200 then done = true
            else stableSince = -1L
            if !done then Thread.sleep(20)
        done

    def spec = suite("the delivery budget: exactly n loaded")(
        test("the send spending the last unit is the last one sent; the tail survives for the next resume") {
            val recording = RecordingConsumer(p0)
            val listener = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = _ => ()))
            val runner = session(targetRunner(listener, Map(p0 -> recording.consumer)), evenOnly)
            val observer = CollectingObserver()

            // Budget 3, no rate limit: full speed until the third LOADED message, then a hard stop.
            runner.resume(observer, isDebug = false, includeConsumerStats = true, maxMessagesPerSecond = 0, maxMessagesToDeliver = 3)
            (1 to 20).foreach(n => listener.received(recording.consumer, message(n)))

            val firstStop = awaitStable() {
                observer.loadedValues.size == 3 && runner.deliveryRateLimiter.queuedCount > 0
            }
            val loadedAfterFirst = observer.loadedValues.asScala.toVector
            val processedAfterFirst = runner.numMessageProcessed
            val queuedAfterFirst = runner.deliveryRateLimiter.queuedCount

            // Play again with the same budget: the NEXT three evens, in order, from exactly where
            // the drain stopped - nothing lost, nothing repeated.
            runner.resume(observer, isDebug = false, includeConsumerStats = true, maxMessagesPerSecond = 0, maxMessagesToDeliver = 3)
            val secondStop = awaitStable() { observer.loadedValues.size == 6 }
            val loadedAfterSecond = observer.loadedValues.asScala.toVector

            assertTrue(firstStop) &&
            assertTrue(loadedAfterFirst.map(v => io.circe.parser.parse(v).toOption.get.hcursor.get[Int]("n").toOption.get) == Vector(2, 4, 6)) &&
            // Processed ran AHEAD of loaded - the filter read the odd ones too - but the loaded
            // count stopped at exactly the budget. "100 may be processed, but only 10 loaded."
            assertTrue(processedAfterFirst == 6L) &&
            assertTrue(queuedAfterFirst == 14) &&
            assertTrue(secondStop) &&
            assertTrue(loadedAfterSecond.map(v => io.circe.parser.parse(v).toOption.get.hcursor.get[Int]("n").toOption.get) == Vector(2, 4, 6, 8, 10, 12))
        },
        test("a budget WITH a rate limit: the one-second burst cannot blow past n") {
            // The user's exact screenshot: rate 100, pause after 10. The bucket starts full, so
            // without the budget the first drain hands out 100 at once - the budget must cap that
            // very first batch.
            val recording = RecordingConsumer(p0)
            val listener = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = _ => ()))
            val runner = session(targetRunner(listener, Map(p0 -> recording.consumer)), MessageFilterChain.empty)
            val observer = CollectingObserver()

            runner.resume(observer, isDebug = false, includeConsumerStats = true, maxMessagesPerSecond = 100, maxMessagesToDeliver = 10)
            (1 to 100).foreach(n => listener.received(recording.consumer, message(n)))

            val stopped = awaitStable() { observer.loadedValues.size == 10 }
            assertTrue(stopped) && assertTrue(observer.loadedValues.size == 10)
        }
    ) @@ TestAspect.sequential @@ TestAspect.withLiveClock
