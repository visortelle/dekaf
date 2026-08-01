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
import org.apache.pulsar.client.admin.PulsarAdmin
import org.apache.pulsar.client.api.PulsarClient
import zio.test.*

import java.util.concurrent.TimeUnit
import scala.util.Try

/** `ConsumerSessionRunner.make` is what `ConsumerServiceImpl.createConsumer` reports on: if it
  * returns, the session is stored and the client is told Code.OK.
  *
  * Regression context: it accepted a runner with ZERO consumers. A `MultiTopicSelector` with no
  * topics (or one whose topics all failed to resolve, before that was made loud) produced a target
  * runner with an empty consumer map; `make` built a session from it and `createConsumer` answered
  * OK, so the UI showed a session in state `running` that could never deliver a message and never
  * explained why.
  *
  * The clients are REAL, aimed at a closed port. They construct offline and are never used on this
  * path (an empty selection touches neither `getSchemasByTopic` nor `handleStartFrom`), but using
  * real objects rather than nulls means an accidental use would surface as a connection error, not
  * as an NPE that makes the assertion pass for the wrong reason.
  */
object consumerSessionRunnerTest extends ZIOSpecDefault:

    private def withOfflineClients[A](f: (PulsarClient, PulsarAdmin) => A): A =
        val client = PulsarClient.builder
            .serviceUrl("pulsar://127.0.0.1:1")
            .operationTimeout(2, TimeUnit.SECONDS)
            .build
        val admin = PulsarAdmin.builder
            .serviceHttpUrl("http://127.0.0.1:1")
            .connectionTimeout(2, TimeUnit.SECONDS)
            .readTimeout(2, TimeUnit.SECONDS)
            .requestTimeout(2, TimeUnit.SECONDS)
            .build
        try f(client, admin)
        finally
            Try(client.close())
            Try(admin.close())

    private def target(isEnabled: Boolean, topicFqns: Vector[String]): ConsumerSessionTarget =
        ConsumerSessionTarget(
            isEnabled = isEnabled,
            consumptionMode = ConsumerSessionTargetConsumptionMode(mode = RegularConsumptionMode()),
            messageValueDeserializer = Deserializer(deserializer = UseLatestTopicSchema()),
            topicSelector = TopicSelector(topicSelector = MultiTopicSelector(topicFqns = topicFqns)),
            messageFilterChain = MessageFilterChain.empty,
            coloringRuleChain = ColoringRuleChain.empty,
            valueProjectionList = ValueProjectionList(isEnabled = false, projections = Vector.empty)
        )

    private def sessionConfig(targets: Vector[ConsumerSessionTarget]): ConsumerSessionConfig =
        ConsumerSessionConfig(
            startFrom = EarliestMessage(),
            targets = targets,
            messageFilterChain = MessageFilterChain.empty,
            coloringRuleChain = ColoringRuleChain.empty,
            pauseTriggerChain = ConsumerSessionPauseTriggerChain.empty,
            valueProjectionList = ValueProjectionList(isEnabled = false, projections = Vector.empty)
        )

    private def make(sessionName: String, targets: Vector[ConsumerSessionTarget]): Try[ConsumerSessionRunner] =
        withOfflineClients((client, admin) =>
            Try(ConsumerSessionRunner.make(
                pulsarClient = client,
                adminClient = admin,
                sessionName = sessionName,
                sessionConfig = sessionConfig(targets)
            ))
        )

    def spec = suite(this.getClass.toString)(
        test("a session whose only enabled target resolves to no topics is rejected") {
            val result = make("cs-empty-target", Vector(target(isEnabled = true, topicFqns = Vector.empty)))
            val message = result.failed.toOption.map(_.getMessage).getOrElse("")

            assertTrue(result.isFailure, message.contains("no topics")) ??
                s"a target that resolves to nothing must not produce a consumer-less session, got: $result"
        },
        test("a disabled target does not rescue a session that has no enabled target left") {
            // Disabled targets are filtered out before consumers are built, so a session made only
            // of them is just as empty - and used to be accepted just as silently.
            val result = make("cs-only-disabled", Vector(target(isEnabled = false, topicFqns = Vector("persistent://public/default/t1"))))
            val message = result.failed.toOption.map(_.getMessage).getOrElse("")

            assertTrue(result.isFailure, message.contains("no enabled targets")) ??
                s"a session with nothing enabled must be rejected, got: $result"
        },
        test("a session with no targets at all is rejected") {
            val result = make("cs-no-targets", Vector.empty)
            val message = result.failed.toOption.map(_.getMessage).getOrElse("")

            assertTrue(result.isFailure, message.contains("no enabled targets"))
        }
    )
