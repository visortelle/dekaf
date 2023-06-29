import zio.*
import _root_.generators
import _root_.generators.{
    NamespacePlan,
    NamespacePlanExecutor,
    NamespacePlanGenerator,
    ProducerPlanGenerator,
    TopicPlan,
    TopicPlanExecutor,
    TopicPlanGenerator
}

val namespacePlanGenerator =
    val namespaceName = "few-more-topics-100"
    NamespacePlanGenerator.make(
        getTenant = () => "public",
        getName = _ => namespaceName,
        getTopicsCount = _ => 10,
        getTopicGenerator = topicIndex =>
            TopicPlanGenerator.make(
                getTenant = () => "public",
                getNamespace = () => namespaceName,
                getName = topicIndex => s"$topicIndex-${java.time.Instant.now().toString}",
                getProducersCount = _ => 2,
                getPayload = _ => Array[Byte](1, 2, 3),
                getProducerGenerator = _ =>
                    ProducerPlanGenerator.make(
                        getSchedule = _ => Schedule.fixed(Duration.fromMillis(100))
                    ),
                getSubscriptionsCount = _ => 3
            )
    )

val namespacePlan = NamespacePlan.make(namespacePlanGenerator, 0)

object MainApp extends ZIOAppDefault:
    def run = for {
        _ <- ZIO.logInfo("Starting app...")
        _ <- NamespacePlanExecutor.allocateResources(namespacePlan)
    } yield ()
