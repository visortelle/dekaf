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
        topicsAsPairs <- ZIO.foreach(List.range(0, generator.mkTopicsCount(namespaceIndex))) { topicIndex =>
            for {
                topicGenerator <- generator.mkTopicGenerator(topicIndex)
                topicPlan <- TopicPlan.make(topicGenerator, topicIndex)
            } yield topicPlan.name -> topicPlan
        }
        topics <- ZIO.succeed(topicsAsPairs.toMap)
        namespacePlan <- ZIO.succeed {
            NamespacePlan(
                tenant = generator.mkTenant(),
                name = generator.mkName(namespaceIndex),
                topics = topics,
                afterAllocation = () => generator.mkAfterAllocation(namespaceIndex)
            )
        }
    } yield namespacePlan

case class NamespacePlanGenerator(
    mkTenant: () => TenantName,
    mkName: NamespaceIndex => NamespaceName,
    mkTopicsCount: NamespaceIndex => Int,
    mkTopicGenerator: TopicIndex => Task[TopicPlanGenerator],
    mkAfterAllocation: NamespaceIndex => Unit = _ => ()
)

object NamespacePlanGenerator:
    def make(
        mkTenant: () => TenantName = () => "pulsocat_default",
        mkName: NamespaceIndex => NamespaceName = namespaceIndex => s"namespace-$namespaceIndex",
        mkTopicsCount: NamespaceIndex => Int = _ => 1,
        mkTopicGenerator: TopicIndex => Task[TopicPlanGenerator] = _ => TopicPlanGenerator.make(),
        mkAfterAllocation: NamespaceIndex => Unit = _ => ()
    ): Task[NamespacePlanGenerator] =
        val namespacePlanGenerator = NamespacePlanGenerator(
            mkTenant = mkTenant,
            mkName = mkName,
            mkTopicsCount = mkTopicsCount,
            mkTopicGenerator = mkTopicGenerator,
            mkAfterAllocation = mkAfterAllocation
        )

        ZIO.succeed(namespacePlanGenerator)

object NamespacePlanExecutor:
    private def mkNamespaceFqn = (namespacePlan: NamespacePlan) => s"${namespacePlan.tenant}/${namespacePlan.name}"

    def allocateResources(namespacePlan: NamespacePlan): Task[NamespacePlan] = for {
        _ <- ZIO.logInfo(s"Allocating resources for namespace ${namespacePlan.name}")
        namespaceFqn <- ZIO.attempt(mkNamespaceFqn(namespacePlan))
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
