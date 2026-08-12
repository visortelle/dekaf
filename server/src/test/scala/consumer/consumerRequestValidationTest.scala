package consumer

import _root_.consumer.session_config.{ConsumerSessionConfig, DeliveryOrderKey, MessageDeliveryOrder}
import _root_.consumer.session_runner.ConsumerSessionRunner
import com.google.rpc.code.Code
import com.tools.teal.pulsar.ui.api.v1.consumer as consumerPb
import zio.test.*

import java.util.concurrent.ConcurrentHashMap
import scala.concurrent.Await
import scala.concurrent.duration.{Duration, SECONDS}
import scala.util.Try

/** WHOSE FAULT IS IT, AND WHICH FIELD.
  *
  * Create used to answer FAILED_PRECONDITION for everything it refused: a request with no config at
  * all, an enum this server has never heard of, a target that carries no consumption mode, a
  * fraction of NaN, a broker that would not resolve a topic, and a server already at its session
  * cap were one status apart from each other. FAILED_PRECONDITION says "the server or the world is
  * in the wrong state, try again later"; a malformed request is INVALID_ARGUMENT and retrying it
  * unchanged can never work. The two are also the difference between a client that can point at a
  * field and one that can only shrug.
  *
  * And an enum value from a NEWER client is not a synonym for "the default". Absence is - proto3
  * zero is what every older client and every pre-field saved item sends - but `Unrecognized(n)` is
  * a client asking for something this server does not implement, and silently running a different
  * one is the quiet wrong answer this refuses.
  */
object consumerRequestValidationTest extends ZIOSpecDefault:

    private val topicFqn = "persistent://public/default/cs-request-validation"

    private def targetPb(
        readCompacted: Boolean = false,
        isEnabled: Boolean = true,
        topicFqns: Vector[String] = Vector(topicFqn)
    ): consumerPb.ConsumerSessionTarget =
        consumerPb.ConsumerSessionTarget(
            isEnabled = isEnabled,
            consumptionMode = Some(
                consumerPb.ConsumerSessionTargetConsumptionMode(mode =
                    if readCompacted then
                        consumerPb.ConsumerSessionTargetConsumptionMode.Mode.ModeReadCompacted(consumerPb.ConsumerSessionTargetConsumptionMode.ReadCompacted())
                    else consumerPb.ConsumerSessionTargetConsumptionMode.Mode.ModeRegular(consumerPb.ConsumerSessionTargetConsumptionMode.Regular())
                )
            ),
            messageValueDeserializer = Some(
                consumerPb.Deserializer(deserializer =
                    consumerPb.Deserializer.Deserializer.DeserializerUseLatestTopicSchema(consumerPb.Deserializer.UseLatestTopicSchema())
                )
            ),
            topicSelector = Some(
                consumerPb.TopicSelector(topicSelector =
                    consumerPb.TopicSelector.TopicSelector.MultiTopicSelector(consumerPb.MultiTopicSelector(topicFqns = topicFqns))
                )
            )
        )

    private def startFromPb(startFrom: consumerPb.ConsumerSessionStartFrom.StartFrom): consumerPb.ConsumerSessionStartFrom =
        consumerPb.ConsumerSessionStartFrom(startFrom = startFrom)

    /** A service whose builder never touches a broker, so every status below is this class's own
      * classification and nothing else's. */
    private def service(build: (ConsumerSessionName, ConsumerSessionConfig) => ConsumerSessionRunner = (name, config) =>
        ConsumerSessionRunner(
            sessionName = name,
            sessionConfig = config,
            sessionContextPool = _root_.consumer.session_runner.ConsumerSessionContextPool(),
            grpcResponseObserver = None,
            schemasByTopic = Map.empty,
            targets = Map.empty
        )
    ): ConsumerServiceImpl =
        ConsumerServiceImpl(new ConcurrentHashMap[ConsumerSessionName, ConsumerSessionRunner](), makeSession = build)

    private def create(svc: ConsumerServiceImpl, request: consumerPb.CreateConsumerRequest): com.google.rpc.status.Status =
        Await.result(svc.createConsumer(request), Duration(60, SECONDS)).status.get

    private def createWith(config: consumerPb.ConsumerSessionConfig, name: String = "cs-request-validation"): com.google.rpc.status.Status =
        create(service(), consumerPb.CreateConsumerRequest(consumerName = name, consumerSessionConfig = Some(config)))

    private def validConfig: consumerPb.ConsumerSessionConfig =
        consumerPb.ConsumerSessionConfig(targets = Seq(targetPb()))

    private val unknownEnumSuite = suite("P2.4: an enum from a NEWER client is refused, not silently reinterpreted")(
        test("an unrecognised delivery-order KEY is refused rather than quietly becoming publish time") {
            // Publish time, broker publish time and event time order a merged session by three
            // different clocks. A client that asked for a fourth got publish time and no word about
            // it, so the session it saw was ordered by something it never chose.
            val refused = Try(DeliveryOrderKey.fromPb(consumerPb.DeliveryOrderKey.Unrecognized(99))).failed.toOption
            assertTrue(
                refused.exists(_.getMessage.contains("99")),
                refused.exists(_.getMessage.contains("delivery_order_key"))
            ) ?? s"refused=${refused.map(_.getMessage)}"
        },
        test("absence still means publish time - the documented default, and what every older client sends") {
            assertTrue(
                DeliveryOrderKey.fromPb(consumerPb.DeliveryOrderKey.DELIVERY_ORDER_KEY_UNSPECIFIED) == DeliveryOrderKey.PublishTime,
                DeliveryOrderKey.fromPb(consumerPb.DeliveryOrderKey.DELIVERY_ORDER_KEY_PUBLISH_TIME) == DeliveryOrderKey.PublishTime,
                DeliveryOrderKey.fromPb(consumerPb.DeliveryOrderKey.DELIVERY_ORDER_KEY_BROKER_PUBLISH_TIME) == DeliveryOrderKey.BrokerPublishTime,
                DeliveryOrderKey.fromPb(consumerPb.DeliveryOrderKey.DELIVERY_ORDER_KEY_EVENT_TIME) == DeliveryOrderKey.EventTime
            )
        },
        test("an unrecognised delivery ORDER stays the settled product default - that one is deliberate") {
            // Not a regression of the above: the owner decided this enum resolves an unknown value
            // to the product default rather than accidentally selecting Fastest. Owner decision
            // (2026-08-11, direct instruction): the default is Guaranteed - the third move of this
            // default; the plan file's decision log is the record.
            assertTrue(MessageDeliveryOrder.fromPb(consumerPb.MessageDeliveryOrder.Unrecognized(99)) == MessageDeliveryOrder.Guaranteed)
        },
        test("the create RPC refuses the unknown key with INVALID_ARGUMENT and names the field") {
            val status = createWith(validConfig.withDeliveryOrderKey(consumerPb.DeliveryOrderKey.Unrecognized(99)))
            assertTrue(
                status.code == Code.INVALID_ARGUMENT.value,
                status.message.contains("delivery_order_key"),
                status.message.contains("99")
            ) ?? s"status=$status"
        }
    )

    private val malformedConfigSuite = suite("P2.5: a malformed config says WHICH field, and is bad INPUT")(
        test("a request with no config at all is INVALID_ARGUMENT, not a precondition failure") {
            val status = create(service(), consumerPb.CreateConsumerRequest(consumerName = "cs-no-config"))
            assertTrue(
                status.code == Code.INVALID_ARGUMENT.value,
                status.message.contains("consumer_session_config")
            ) ?? s"status=$status"
        },
        test("an empty TARGET names the target index and the field inside it") {
            // The shallow saved-session check lets `{}` through as a target; on the server it used
            // to surface as a bare 'Invalid ConsumerSessionTargetConsumptionMode mode.' under
            // FAILED_PRECONDITION, with nothing saying which of the session's targets was at fault.
            val status = createWith(consumerPb.ConsumerSessionConfig(targets = Seq(targetPb(), consumerPb.ConsumerSessionTarget())))
            assertTrue(
                status.code == Code.INVALID_ARGUMENT.value,
                status.message.contains("targets[1]"),
                status.message.contains("consumption_mode")
            ) ?? s"status=$status"
        },
        test("a target with no topic selector names targets[n] and topic_selector") {
            val broken = targetPb().clearTopicSelector
            val status = createWith(consumerPb.ConsumerSessionConfig(targets = Seq(broken)))
            assertTrue(
                status.code == Code.INVALID_ARGUMENT.value,
                status.message.contains("targets[0]"),
                status.message.contains("topic_selector")
            ) ?? s"status=$status"
        },
        test("a start_from carrying no mode at all names start_from") {
            val status = createWith(validConfig.withStartFrom(consumerPb.ConsumerSessionStartFrom()))
            assertTrue(
                status.code == Code.INVALID_ARGUMENT.value,
                status.message.contains("start_from")
            ) ?? s"status=$status"
        }
    )

    private val statusCodeSuite = suite("P2.13: malformed INPUT is INVALID_ARGUMENT; the world's state is FAILED_PRECONDITION")(
        test("a negative 'skip first n' is bad input") {
            val status = createWith(
                validConfig.withStartFrom(
                    startFromPb(
                        consumerPb.ConsumerSessionStartFrom.StartFrom.StartFromNthMessageAfterEarliest(consumerPb.NthMessageAfterEarliest(n = -1))
                    )
                )
            )
            assertTrue(status.code == Code.INVALID_ARGUMENT.value, status.message.contains("Skip first n")) ?? s"status=$status"
        },
        test("a 'latest n' past the accepted ceiling is bad input") {
            val status = createWith(
                validConfig.withStartFrom(
                    startFromPb(
                        consumerPb.ConsumerSessionStartFrom.StartFrom.StartFromNthMessageBeforeLatest(
                            consumerPb.NthMessageBeforeLatest(n = _root_.consumer.session_runner.latestNMaxAccepted + 1)
                        )
                    )
                )
            )
            assertTrue(status.code == Code.INVALID_ARGUMENT.value, status.message.contains("Latest n messages")) ?? s"status=$status"
        },
        test("a fraction that is not a fraction is bad input - both approximate modes") {
            val nan = createWith(
                validConfig.withStartFrom(
                    startFromPb(
                        consumerPb.ConsumerSessionStartFrom.StartFrom.StartFromApproximateEntryPosition(
                            consumerPb.ApproximateEntryPosition(fraction = Double.NaN)
                        )
                    )
                )
            )
            val outOfRange = createWith(
                validConfig.withStartFrom(
                    startFromPb(
                        consumerPb.ConsumerSessionStartFrom.StartFrom.StartFromApproximatePublishTimePosition(
                            consumerPb.ApproximatePublishTimePosition(fraction = 1.5)
                        )
                    )
                )
            )
            assertTrue(
                nan.code == Code.INVALID_ARGUMENT.value,
                nan.message.contains("% of data"),
                outOfRange.code == Code.INVALID_ARGUMENT.value,
                outOfRange.message.contains("% of time")
            ) ?? s"nan=$nan outOfRange=$outOfRange"
        },
        test("more enabled targets than one session may run is bad input") {
            val targets = (0 to ConsumerSessionRunner.maxEnabledTargetsPerSession).map(_ => targetPb())
            val status = createWith(consumerPb.ConsumerSessionConfig(targets = targets))
            assertTrue(status.code == Code.INVALID_ARGUMENT.value, status.message.contains("enabled targets")) ?? s"status=$status"
        },
        test("a start position that cannot describe a compacted target is bad input - it is a CONFIG contradiction") {
            val status = createWith(
                consumerPb
                    .ConsumerSessionConfig(targets = Seq(targetPb(readCompacted = true)))
                    .withStartFrom(
                        startFromPb(
                            consumerPb.ConsumerSessionStartFrom.StartFrom.StartFromApproximateEntryPosition(
                                consumerPb.ApproximateEntryPosition(fraction = 0.5)
                            )
                        )
                    )
            )
            assertTrue(status.code == Code.INVALID_ARGUMENT.value, status.message.contains("read compacted")) ?? s"status=$status"
        },
        test("a DISABLED target's contradiction is not held against the request") {
            // The read-compacted refusal is indexed over ENABLED targets only, exactly as the
            // session builder counts them - a disabled target is not part of this session.
            val status = createWith(
                consumerPb
                    .ConsumerSessionConfig(targets = Seq(targetPb(), targetPb(readCompacted = true, isEnabled = false)))
                    .withStartFrom(
                        startFromPb(
                            consumerPb.ConsumerSessionStartFrom.StartFrom.StartFromApproximateEntryPosition(
                                consumerPb.ApproximateEntryPosition(fraction = 0.5)
                            )
                        )
                    )
            )
            assertTrue(status.code == Code.OK.value) ?? s"status=$status"
        },
        test("a broker that will not resolve the topology stays FAILED_PRECONDITION - retrying CAN work") {
            val svc = service(build = (_, _) => throw new RuntimeException("Failed to resolve topic persistent://x/y/z. broker unreachable"))
            val status = create(svc, consumerPb.CreateConsumerRequest(consumerName = "cs-topology", consumerSessionConfig = Some(validConfig)))
            assertTrue(
                status.code == Code.FAILED_PRECONDITION.value,
                status.message.contains("broker unreachable")
            ) ?? s"status=$status"
        },
        test("the server's own session cap stays FAILED_PRECONDITION - it is CURRENT STATE, not the request") {
            val svc = ConsumerServiceImpl(
                new ConcurrentHashMap[ConsumerSessionName, ConsumerSessionRunner](),
                makeSession = (name, config) =>
                    ConsumerSessionRunner(
                        sessionName = name,
                        sessionConfig = config,
                        sessionContextPool = _root_.consumer.session_runner.ConsumerSessionContextPool(),
                        grpcResponseObserver = None,
                        schemasByTopic = Map.empty,
                        targets = Map.empty
                    ),
                maxActiveSessions = 1
            )
            val first = create(svc, consumerPb.CreateConsumerRequest(consumerName = "cs-cap-1", consumerSessionConfig = Some(validConfig)))
            val second = create(svc, consumerPb.CreateConsumerRequest(consumerName = "cs-cap-2", consumerSessionConfig = Some(validConfig)))
            assertTrue(
                first.code == Code.OK.value,
                second.code == Code.FAILED_PRECONDITION.value,
                second.message.contains("limit")
            ) ?? s"first=$first second=$second"
        },
        test("a well-formed request is still accepted - the validation refuses nothing it should not") {
            assertTrue(createWith(validConfig).code == Code.OK.value)
        }
    )

    def spec = suite(this.getClass.toString)(unknownEnumSuite, malformedConfigSuite, statusCodeSuite)
