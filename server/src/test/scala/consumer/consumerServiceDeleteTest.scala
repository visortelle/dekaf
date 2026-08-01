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
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.{AtomicBoolean, AtomicLong}
import scala.concurrent.Await
import scala.concurrent.duration.{Duration, SECONDS}

/** Deleting a consumer session: what the client is told, and what is left behind.
  *
  * Regression context: `deleteConsumer` removed the session from the map ONLY when `stop` returned
  * without throwing - and `stop` never threw, because it swallowed every unsubscribe failure and
  * reported nothing. So a broker that refused to delete a subscription produced a cheerful OK with
  * the subscription still on the broker. Making `stop` honest then exposed the other half: if the
  * removal stayed conditional on success, one undeletable subscription would make the session name
  * permanently undeletable too.
  */
object consumerServiceDeleteTest extends ZIOSpecDefault:

    private val topicFqn = "persistent://public/default/delete-me"

    private final class RecordingConsumer(unsubscribeFails: Boolean):
        val unsubscribed = AtomicBoolean(false)
        val closed = AtomicBoolean(false)

        val consumer: Consumer[Array[Byte]] =
            val handler = new InvocationHandler:
                override def invoke(proxy: Object, method: Method, args: Array[Object]): Object =
                    method.getName match
                        case "getTopic" => topicFqn
                        case "unsubscribe" =>
                            unsubscribed.set(true)
                            if unsubscribeFails then throw new RuntimeException("broker refused to delete the subscription")
                            null
                        case "close"    => closed.set(true); null
                        case "pause"    => null
                        case "equals"   => java.lang.Boolean.valueOf(proxy eq args(0))
                        case "hashCode" => java.lang.Integer.valueOf(topicFqn.hashCode)
                        case "toString" => "proxy-consumer"
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
            consumerListener = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = _ => ())),
            stats = ConsumerSessionTargetStats(messageProcessed = AtomicLong(0))
        )
        ConsumerSessionRunner(
            sessionName = "cs-delete",
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

    private def delete(service: ConsumerServiceImpl, name: String): consumerPb.DeleteConsumerResponse =
        Await.result(service.deleteConsumer(consumerPb.DeleteConsumerRequest(consumerName = name)), Duration(30, SECONDS))

    def spec = suite(this.getClass.toString)(
        test("a clean delete releases the consumer and answers OK") {
            val recording = RecordingConsumer(unsubscribeFails = false)
            val sessions = new ConcurrentHashMap[ConsumerSessionName, ConsumerSessionRunner]()
            sessions.put("cs-delete", session(recording.consumer))
            val service = ConsumerServiceImpl(sessions)

            val response = delete(service, "cs-delete")

            assertTrue(
                response.getStatus.code == com.google.rpc.code.Code.OK.value,
                recording.unsubscribed.get,
                recording.closed.get,
                sessions.isEmpty
            )
        },
        test("a delete whose unsubscribe fails REPORTS it instead of answering OK") {
            // The regression: the failure was printed to stdout and the client was told OK, so a
            // subscription left on the broker looked like a successful delete.
            val recording = RecordingConsumer(unsubscribeFails = true)
            val sessions = new ConcurrentHashMap[ConsumerSessionName, ConsumerSessionRunner]()
            sessions.put("cs-delete", session(recording.consumer))
            val service = ConsumerServiceImpl(sessions)

            val response = delete(service, "cs-delete")

            assertTrue(
                response.getStatus.code == com.google.rpc.code.Code.FAILED_PRECONDITION.value,
                response.getStatus.message.contains(topicFqn)
            ) ?? s"status=${response.getStatus}"
        },
        test("a delete whose unsubscribe fails still removes the handle and closes the consumer") {
            // Otherwise one undeletable subscription strands the session forever: the entry stays,
            // nothing can reach it, and every retry fails the same way.
            val recording = RecordingConsumer(unsubscribeFails = true)
            val sessions = new ConcurrentHashMap[ConsumerSessionName, ConsumerSessionRunner]()
            sessions.put("cs-delete", session(recording.consumer))
            val service = ConsumerServiceImpl(sessions)

            delete(service, "cs-delete")

            assertTrue(sessions.isEmpty, recording.closed.get) ??
                s"sessionsLeft=${sessions.size} closed=${recording.closed.get}"
        },
        test("deleting a session that does not exist is a clean FAILED_PRECONDITION") {
            val service = ConsumerServiceImpl(new ConcurrentHashMap[ConsumerSessionName, ConsumerSessionRunner]())
            val response = delete(service, "nope")
            assertTrue(response.getStatus.code == com.google.rpc.code.Code.FAILED_PRECONDITION.value)
        }
    ) @@ TestAspect.sequential
