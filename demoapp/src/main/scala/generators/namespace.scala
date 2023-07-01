package generators

import zio.*
import _root_.client.{adminClient, pulsarClient}

type NamespaceName = String
type NamespaceIndex = Int

case class NamespacePlan(
    tenant: String,
    name: NamespaceName,
    topics: Map[TopicName, TopicPlan]
)

object NamespacePlan:
    def make(generator: NamespacePlanGenerator, namespaceIndex: Int): NamespacePlan =
        val topics = List
            .tabulate(generator.getTopicsCount(namespaceIndex)) { topicIndex =>
                val topicGenerator = generator.getTopicGenerator(namespaceIndex)
                val topicPlan = TopicPlan.make(topicGenerator, topicIndex)

                topicPlan.name -> topicPlan
            }
            .toMap

        NamespacePlan(
            tenant = generator.getTenant(),
            name = generator.getName(namespaceIndex),
            topics = topics
        )

case class NamespacePlanGenerator(
    getTenant: () => TenantName,
    getName: NamespaceIndex => NamespaceName,
    getTopicsCount: NamespaceIndex => Int,
    getTopicGenerator: NamespaceIndex => TopicPlanGenerator
)

object NamespacePlanGenerator:
    def make(
        getTenant: () => TenantName = () => "pulsocat_default",
        getName: NamespaceIndex => NamespaceName = namespaceIndex => s"namespace-${namespaceIndex}",
        getTopicsCount: NamespaceIndex => Int = _ => 1,
        getTopicGenerator: TopicIndex => TopicPlanGenerator = _ => TopicPlanGenerator.make()
    ): NamespacePlanGenerator =
        NamespacePlanGenerator(
            getTenant = getTenant,
            getName = getName,
            getTopicsCount = getTopicsCount,
            getTopicGenerator = getTopicGenerator
        )

object NamespacePlanExecutor:
    private def getNamespaceFqn = (namespacePlan: NamespacePlan) => s"${namespacePlan.tenant}/${namespacePlan.name}"

    def allocateResources(namespacePlan: NamespacePlan): Task[NamespacePlan] = for {
      namespaceFqn <- ZIO.attempt(getNamespaceFqn(namespacePlan))
      _ <- ZIO.attempt {
        val isNamespaceExists = adminClient.namespaces.getNamespaces(namespacePlan.tenant).contains(namespaceFqn)
        if !isNamespaceExists then
          adminClient.namespaces.createNamespace(namespaceFqn)
      }
      _ <- ZIO.foreachPar(namespacePlan.topics.values)(TopicPlanExecutor.allocateResources).withParallelism(10)
      _ <- ZIO.foreachParDiscard(namespacePlan.topics.values)(TopicPlanExecutor.start)
    } yield namespacePlan
    
    def start(namespacePlan: NamespacePlan): Task[Unit] =
      ZIO.foreachParDiscard(namespacePlan.topics.values)(TopicPlanExecutor.start)
        
