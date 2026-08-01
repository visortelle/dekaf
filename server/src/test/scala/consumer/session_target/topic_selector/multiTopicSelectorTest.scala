package consumer.session_target.topic_selector

import org.apache.pulsar.client.admin.PulsarAdmin
import zio.test.*

import java.util.concurrent.TimeUnit
import scala.util.Try

/** `MultiTopicSelector` turns the FQNs the user picked into the concrete non-partitioned topics a
  * session subscribes to.
  *
  * Regression context: a topic whose partitioning could not be read was logged with `println` and
  * replaced by `Vector.empty`, i.e. silently dropped from the selection. With every topic
  * unresolvable (an unreachable broker, a topic deleted between the picker and the session) the
  * whole selector returned an empty vector, the session runner accepted a target with zero
  * consumers, and `createConsumer` answered Code.OK - a session in state `running` that could never
  * deliver a message. The sibling `NamespacedRegexTopicSelector` never swallowed these.
  *
  * Driven with a REAL PulsarAdmin aimed at a closed port: it constructs offline (see
  * `pulsar_auth.ClientConstructionTest`) and then fails every call with a connection error, which is
  * exactly the production failure. No broker, no mock.
  */
object multiTopicSelectorTest extends ZIOSpecDefault:

    private def withUnreachableAdmin[A](f: PulsarAdmin => A): A =
        val admin = PulsarAdmin.builder
            .serviceHttpUrl("http://127.0.0.1:1")
            .connectionTimeout(2, TimeUnit.SECONDS)
            .readTimeout(2, TimeUnit.SECONDS)
            .requestTimeout(2, TimeUnit.SECONDS)
            .build
        try f(admin)
        finally Try(admin.close())

    def spec = suite(this.getClass.toString)(
        test("a topic whose partitioning cannot be resolved fails loudly instead of being dropped") {
            val topicFqn = "persistent://public/default/topic-that-cannot-be-resolved"
            val result = withUnreachableAdmin(admin => Try(MultiTopicSelector(Vector(topicFqn)).getNonPartitionedTopics(admin)))
            val message = result.failed.toOption.map(_.getMessage).getOrElse("")

            assertTrue(result.isFailure, message.contains(topicFqn)) ??
                s"an unresolvable topic must not be silently dropped, got: $result"
        },
        test("one unresolvable topic fails the whole selection rather than returning the rest") {
            // The partial-drop case: the user explicitly named three topics, so quietly consuming
            // from a subset is just as wrong as quietly consuming from none.
            val result = withUnreachableAdmin(admin =>
                Try(
                    MultiTopicSelector(Vector(
                        "persistent://public/default/t1",
                        "persistent://public/default/t2",
                        "persistent://public/default/t3"
                    )).getNonPartitionedTopics(admin)
                )
            )

            assertTrue(result.isFailure)
        },
        test("a selector with no topics resolves to an empty vector without contacting the broker") {
            // Control for the session-runner guard below: MultiTopicSelector reports an honest
            // empty result here (no failure to report), which is why rejecting a target that
            // resolves to nothing has to happen in ConsumerSessionRunner.
            val result = withUnreachableAdmin(admin => Try(MultiTopicSelector(Vector.empty).getNonPartitionedTopics(admin)))

            assertTrue(result == scala.util.Success(Vector.empty))
        }
    )
