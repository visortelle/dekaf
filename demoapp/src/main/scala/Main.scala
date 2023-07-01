import zio.*
import _root_.generators
import _root_.generators.{
    NamespaceIndex,
    NamespacePlan,
    NamespacePlanExecutor,
    NamespacePlanGenerator,
    ProducerPlanGenerator,
    TenantPlan,
    TenantPlanExecutor,
    TenantPlanGenerator,
    TopicPlan,
    TopicPlanExecutor,
    TopicPlanGenerator
}

val tenantPlanGenerator = {
    val tenantName = "strange-tenant"

    TenantPlanGenerator.make(
        getName = _ => tenantName,
        getNamespacesCount = _ => 10,
        getNamespaceGenerator = namespaceIndex =>
            val namespaceName = s"strange-namespace-${namespaceIndex.toString}"
            NamespacePlanGenerator.make(
                getTenant = () => tenantName,
                getName = _ => namespaceName,
                getTopicsCount = _ => 10,
                getTopicGenerator = _ =>
                    TopicPlanGenerator.make(
                        getTenant = () => tenantName,
                        getNamespace = () => namespaceName,
                        getName = topicIndex => s"strange-topic-${topicIndex.toString}",
                        getProducersCount = _ => 2,
                        getPayload = _ => Array[Byte](1, 2, 3),
                        getProducerGenerator = _ =>
                            ProducerPlanGenerator.make(
                                getSchedule = _ => Schedule.fixed(Duration.fromMillis(100))
                            ),
                        getSubscriptionsCount = _ => 3
                    )
            )
    )
}

val tenantPlan = TenantPlan.make(tenantPlanGenerator, 0)

object MainApp extends ZIOAppDefault:
    def run = for {
        _ <- ZIO.logInfo("Starting app...")
        _ <- TenantPlanExecutor.allocateResources(tenantPlan)
        _ <- TenantPlanExecutor.start(tenantPlan)
    } yield ()
