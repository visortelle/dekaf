package generators

type NamespaceName = String
type NamespaceIndex = Int

case class Namespace(
    name: NamespaceName,
    topics: Map[TopicName, TopicPlan]
)

case class NamespaceGenerator(
    getTenant: TenantIndex => TenantName,
    getName: NamespaceIndex => NamespaceName,
    getTopicsCount: NamespaceIndex => Int,
    getTopicGenerator: NamespaceIndex => TopicPlanGenerator
)
