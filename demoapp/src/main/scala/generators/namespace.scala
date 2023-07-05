package generators

import zio.*
import _root_.client.{adminClient, pulsarClient}

type NamespaceName = String
type NamespaceIndex = Int

case class NamespacePlan(
    tenant: String,
    name: NamespaceName,
    topics: Map[TopicName, TopicPlan],
    afterAllocation: () => Unit
)

object NamespacePlan:
    def make(generator: NamespacePlanGenerator, namespaceIndex: Int): Task[NamespacePlan] = for {
        topicsAsPairs <- ZIO.foreach(List.range(0, generator.getTopicsCount(namespaceIndex))) { topicIndex =>
            for {
                topicGenerator <- generator.getTopicGenerator(topicIndex)
                topicPlan <- TopicPlan.make(topicGenerator, topicIndex)
            } yield topicPlan.name -> topicPlan
        }
        topics <- ZIO.succeed(topicsAsPairs.toMap)
        namespacePlan <- ZIO.succeed {
            NamespacePlan(
                tenant = generator.getTenant(),
                name = generator.getName(namespaceIndex),
                topics = topics,
                afterAllocation = () => generator.getAfterAllocation(namespaceIndex)
            )
        }
    } yield namespacePlan

case class NamespacePlanGenerator(
    getTenant: () => TenantName,
    getName: NamespaceIndex => NamespaceName,
    getTopicsCount: NamespaceIndex => Int,
    getTopicGenerator: TopicIndex => Task[TopicPlanGenerator],
    getAfterAllocation: NamespaceIndex => Unit = _ => ()
)

object NamespacePlanGenerator:
    def make(
        getTenant: () => TenantName = () => "pulsocat_default",
        getName: NamespaceIndex => NamespaceName = namespaceIndex => s"namespace-$namespaceIndex",
        getTopicsCount: NamespaceIndex => Int = _ => 1,
        getTopicGenerator: TopicIndex => Task[TopicPlanGenerator] = _ => TopicPlanGenerator.make(),
        getAfterAllocation: NamespaceIndex => Unit = _ => ()
    ): Task[NamespacePlanGenerator] =
        val namespacePlanGenerator = NamespacePlanGenerator(
            getTenant = getTenant,
            getName = getName,
            getTopicsCount = getTopicsCount,
            getTopicGenerator = getTopicGenerator,
            getAfterAllocation = getAfterAllocation
        )

        ZIO.succeed(namespacePlanGenerator)

object NamespacePlanExecutor:
    private def getNamespaceFqn = (namespacePlan: NamespacePlan) => s"${namespacePlan.tenant}/${namespacePlan.name}"

    def allocateResources(namespacePlan: NamespacePlan): Task[NamespacePlan] = for {
        _ <- ZIO.logInfo(s"Allocating resources for namespace ${namespacePlan.name}")
        namespaceFqn <- ZIO.attempt(getNamespaceFqn(namespacePlan))
        _ <- ZIO.attempt {
            adminClient.namespaces.createNamespace(namespaceFqn)
        }
        _ <- ZIO.foreachParDiscard(namespacePlan.topics.values)(TopicPlanExecutor.allocateResources).withParallelism(10)
        _ <- ZIO.attempt(namespacePlan.afterAllocation())
    } yield namespacePlan

    def start(namespacePlan: NamespacePlan): Task[Unit] = for {
        _ <- ZIO.logInfo(s"Starting namespace ${namespacePlan.name}")
        _ <- ZIO.foreachParDiscard(namespacePlan.topics.values)(TopicPlanExecutor.start)
    } yield ()
