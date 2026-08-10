package consumer

import _root_.consumer.coloring_rules.ColoringRuleChain
import _root_.consumer.deserializer.Deserializer
import _root_.consumer.deserializer.deserializers.UseLatestTopicSchema
import _root_.consumer.message_filter.MessageFilterChain
import _root_.consumer.pause_trigger.ConsumerSessionPauseTriggerChain
import _root_.consumer.session_config.{ConsumerSessionConfig, MessageDeliveryOrder}
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

import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong
import scala.concurrent.Await
import scala.concurrent.duration.{Duration, SECONDS}

/** `SetDeliveryOrder`: the RPC that makes a disclosed Guaranteed stall ACTIONABLE.
  *
  * A dedicated RPC rather than a field on Resume, because it MUTATES a running session - and it
  * changes the live session only, never the saved configuration. What is pinned here is the
  * SURFACE: which requests are honoured, which are refused and with which status code, and that an
  * unknown or already-closed session is answered cleanly.
  *
  * That a successful call really reaches the ordering layer and releases what the barrier was
  * holding is pinned end to end - through this same RPC - by
  * `consumer.session_runner.liveDeliveryOrderSwitchTest`, which lives next to the layer so it can
  * inject the merge's clock.
  *
  * The session map is a constructor parameter so a real session sits behind the RPC without a
  * broker.
  */
object consumerServiceDeliveryOrderTest extends ZIOSpecDefault:

    private val sessionName = "cs-delivery-order"
    private def p(i: Int): String = s"persistent://public/default/set-order-partition-$i"

    private def call(service: ConsumerServiceImpl, name: String, order: consumerPb.MessageDeliveryOrder): consumerPb.SetDeliveryOrderResponse =
        Await.result(
            service.setDeliveryOrder(consumerPb.SetDeliveryOrderRequest(consumerName = name, messageDeliveryOrder = order)),
            Duration(30, SECONDS)
        )

    private def codeOf(response: consumerPb.SetDeliveryOrderResponse): Int = response.getStatus.code
    private def messageOf(response: consumerPb.SetDeliveryOrderResponse): String = response.getStatus.message

    private def targetRunner(
        listener: ConsumerListener,
        consumers: Map[String, Consumer[Array[Byte]]] = Map.empty
    ): ConsumerSessionTargetRunner =
        ConsumerSessionTargetRunner(
            targetIndex = 0,
            targetConfig = ConsumerSessionTarget(
                isEnabled = true,
                consumptionMode = ConsumerSessionTargetConsumptionMode(mode = RegularConsumptionMode()),
                messageValueDeserializer = Deserializer(deserializer = UseLatestTopicSchema()),
                topicSelector = TopicSelector(topicSelector = MultiTopicSelector(topicFqns = Vector(p(0), p(1)))),
                messageFilterChain = MessageFilterChain.empty,
                coloringRuleChain = ColoringRuleChain.empty,
                valueProjectionList = ValueProjectionList(isEnabled = false, projections = Vector.empty)
            ),
            nonPartitionedTopicFqns = Vector(p(0), p(1)),
            schemasByTopic = Map.empty,
            sessionContextPool = ConsumerSessionContextPool(),
            consumers = consumers,
            pauseArbiters = consumers.map((fqn, c) => fqn -> ConsumerPauseArbiter(c)),
            consumerListener = listener,
            stats = ConsumerSessionTargetStats(messageProcessed = AtomicLong(0))
        )

    private def session(order: MessageDeliveryOrder, listener: ConsumerListener, consumers: Map[String, Consumer[Array[Byte]]] = Map.empty)
        : ConsumerSessionRunner =
        ConsumerSessionRunner(
            sessionName = sessionName,
            sessionConfig = ConsumerSessionConfig(
                startFrom = EarliestMessage(),
                targets = Vector.empty,
                messageFilterChain = MessageFilterChain.empty,
                coloringRuleChain = ColoringRuleChain.empty,
                pauseTriggerChain = ConsumerSessionPauseTriggerChain.empty,
                valueProjectionList = ValueProjectionList(isEnabled = false, projections = Vector.empty),
                messageDeliveryOrder = order
            ),
            sessionContextPool = ConsumerSessionContextPool(),
            grpcResponseObserver = None,
            schemasByTopic = Map.empty,
            targets = Map(0 -> targetRunner(listener, consumers))
        )

    private def plainListener(): ConsumerListener =
        val l = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = _ => ()))
        l.startAcceptingNewMessages()
        l

    private def serviceWith(runner: ConsumerSessionRunner): ConsumerServiceImpl =
        val sessions = new ConcurrentHashMap[ConsumerSessionName, ConsumerSessionRunner]()
        sessions.put(sessionName, runner)
        ConsumerServiceImpl(sessions)

    def spec = suite(this.getClass.toString)(
        test("GUARANTEED -> BEST EFFORT is accepted, and the session's LIVE order really changes") {
            val runner = session(MessageDeliveryOrder.Guaranteed, plainListener())
            val service = serviceWith(runner)
            val orderBefore = runner.deliveryOrder

            val response = call(service, sessionName, consumerPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_BEST_EFFORT_BY_PUBLISH_TIME)
            // Idempotent: a second click, or a second client, must not become an error.
            val again = call(service, sessionName, consumerPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_BEST_EFFORT_BY_PUBLISH_TIME)

            assertTrue(
                orderBefore == MessageDeliveryOrder.Guaranteed,
                codeOf(response) == com.google.rpc.code.Code.OK.value,
                runner.deliveryOrder == MessageDeliveryOrder.BestEffort,
                codeOf(again) == com.google.rpc.code.Code.OK.value,
                runner.deliveryOrder == MessageDeliveryOrder.BestEffort,
                // The SAVED configuration is untouched - this is a live control, and writing the
                // new order into the session definition is the client's decision, not this RPC's.
                runner.sessionConfig.messageDeliveryOrder == MessageDeliveryOrder.Guaranteed
            ) ?? s"response=${response.getStatus} again=${again.getStatus} live=${runner.deliveryOrder}"
        },
        test("PROMOTION IS REFUSED with FAILED_PRECONDITION and a reason the user can act on") {
            val runner = session(MessageDeliveryOrder.BestEffort, plainListener())
            val service = serviceWith(runner)

            val response = call(service, sessionName, consumerPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_GUARANTEED)

            assertTrue(
                codeOf(response) == com.google.rpc.code.Code.FAILED_PRECONDITION.value,
                messageOf(response).contains("Start the session again"),
                runner.deliveryOrder == MessageDeliveryOrder.BestEffort // unchanged
            ) ?? s"status=${response.getStatus} live=${runner.deliveryOrder}"
        },
        test("SWITCHING TO FASTEST IS REFUSED, and says where Fastest does belong") {
            val runner = session(MessageDeliveryOrder.Guaranteed, plainListener())
            val service = serviceWith(runner)

            val response = call(service, sessionName, consumerPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_AS_RECEIVED)

            assertTrue(
                codeOf(response) == com.google.rpc.code.Code.FAILED_PRECONDITION.value,
                messageOf(response).contains("Play"),
                runner.deliveryOrder == MessageDeliveryOrder.Guaranteed
            ) ?? s"status=${response.getStatus} live=${runner.deliveryOrder}"
        },
        test("A REQUEST THAT NAMES NO ORDER IS INVALID_ARGUMENT, never the product default") {
            // `MessageDeliveryOrder.fromPb` resolves absence to Best effort, which is right for a
            // session configuration and would be a silent SWITCH here - this session runs
            // Guaranteed and never asked to leave it. The wire value has to be checked before the
            // conversion, and this is what pins it.
            val runner = session(MessageDeliveryOrder.Guaranteed, plainListener())
            val service = serviceWith(runner)

            val unspecified = call(service, sessionName, consumerPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_UNSPECIFIED)
            val fromTheFuture = call(service, sessionName, consumerPb.MessageDeliveryOrder.Unrecognized(99))

            assertTrue(
                codeOf(unspecified) == com.google.rpc.code.Code.INVALID_ARGUMENT.value,
                codeOf(fromTheFuture) == com.google.rpc.code.Code.INVALID_ARGUMENT.value,
                runner.deliveryOrder == MessageDeliveryOrder.Guaranteed
            ) ?? s"unspecified=${unspecified.getStatus} unrecognized=${fromTheFuture.getStatus} live=${runner.deliveryOrder}"
        },
        test("an unknown session, and a session whose stream has ended, are both clean refusals") {
            val emptyService = ConsumerServiceImpl(new ConcurrentHashMap[ConsumerSessionName, ConsumerSessionRunner]())
            val unknown = call(emptyService, "nope", consumerPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_BEST_EFFORT_BY_PUBLISH_TIME)

            val stopped = session(MessageDeliveryOrder.Guaranteed, plainListener())
            stopped.stop()
            val closed = call(serviceWith(stopped), sessionName, consumerPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_BEST_EFFORT_BY_PUBLISH_TIME)

            assertTrue(
                codeOf(unknown) == com.google.rpc.code.Code.FAILED_PRECONDITION.value,
                messageOf(unknown).contains("No such consumer session"),
                codeOf(closed) == com.google.rpc.code.Code.FAILED_PRECONDITION.value,
                messageOf(closed).contains("closed")
            ) ?? s"unknown=${unknown.getStatus} closed=${closed.getStatus}"
        }
    ) @@ TestAspect.sequential
