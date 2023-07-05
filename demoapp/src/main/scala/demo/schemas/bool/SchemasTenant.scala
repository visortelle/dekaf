package demo.schemas.bool

import generators.*
import net.datafaker.Faker
import _root_.client.adminClient

val faker = new Faker()

val tenantName = s"basics-${java.time.Instant.now().getEpochSecond}"

def tenantPlanGenerator = TenantPlanGenerator.make(
    getName = _ => tenantName,
    getNamespacesCount = _ => 1,
    getNamespaceGenerator = {
        val namespaceName = "schemas"
        val getSchemaInfos = (_: TopicIndex) => List(org.apache.pulsar.client.api.Schema.BOOL.getSchemaInfo)
        val topicPlanGenerators =
            List(
                TopicPlanGenerator.make(
                    getTenant = () => tenantName,
                    getNamespace = () => namespaceName,
                    getName = _ => "bool-truthy",
                    getProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            getPayload = _ => _ => Array(1.toByte)
                        ),
                    getSchemaInfos = getSchemaInfos
                ),
                TopicPlanGenerator.make(
                    getTenant = () => tenantName,
                    getNamespace = () => namespaceName,
                    getName = _ => "bool-falsy",
                    getProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            getPayload = _ => _ => Array(0.toByte)
                        ),
                    getSchemaInfos = getSchemaInfos
                ),
                TopicPlanGenerator.make(
                    getTenant = () => tenantName,
                    getNamespace = () => namespaceName,
                    getName = _ => "bool-sequence",
                    getProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            getPayload = _ => messageIndex =>
                              println(s"messageIndex: $messageIndex")
                              Array((messageIndex % 2).toByte)
                        ),
                    getSchemaInfos = getSchemaInfos
                ),
                TopicPlanGenerator.make(
                    getTenant = () => tenantName,
                    getNamespace = () => namespaceName,
                    getName = _ => "bool-random",
                    getProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            getPayload = _ => _ => if faker.bool().bool then Array(1.toByte) else Array(0.toByte)
                        ),
                    getSchemaInfos = getSchemaInfos
                )
            )

        val getTopicsCount = (_: Int) => topicPlanGenerators.size
        val namespacePlanGenerators =
            List(
                NamespacePlanGenerator.make(
                    getTenant = () => tenantName,
                    getName = _ => namespaceName,
                    getTopicsCount = getTopicsCount,
                    getTopicGenerator = topicIndex => topicPlanGenerators(topicIndex),
                    getAfterAllocation = _ => {
                        val namespaceFqn = s"$tenantName/$namespaceName"
                        adminClient.namespaces.setSchemaValidationEnforced(namespaceFqn, true)
                    }
                )
            )

        namespacePlanGenerators(_)
    }
)

val tenantPlan = TenantPlan.make(tenantPlanGenerator, 0)
