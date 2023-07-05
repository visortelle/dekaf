package demo.schemas.bool

import zio.*
import generators.*
import net.datafaker.Faker
import _root_.client.adminClient

val faker = new Faker()

val tenantName = s"basics-${java.time.Instant.now().getEpochSecond}"

def getTenantPlanGenerator = TenantPlanGenerator.make(
    getName = _ => tenantName,
    getNamespacesCount = _ => 1,
    getNamespaceGenerator = {
        val namespaceName = "schemas"
        val getSchemaInfos = (_: TopicIndex) => List(org.apache.pulsar.client.api.Schema.BOOL.getSchemaInfo)
        val topicPlanGenerators =
            List(
//                TopicPlanGenerator.make(
//                    getTenant = () => tenantName,
//                    getNamespace = () => namespaceName,
//                    getName = topicIndex => s"$topicIndex-bool-truthy",
//                    getProducerGenerator = _ =>
//                        ProducerPlanGenerator.make(
//                            getPayload = _ => _ => Array(1.toByte)
//                        ),
//                    getSchemaInfos = getSchemaInfos
//                ),
//                TopicPlanGenerator.make(
//                    getTenant = () => tenantName,
//                    getNamespace = () => namespaceName,
//                    getName = topicIndex => s"$topicIndex-bool-falsy",
//                    getProducerGenerator = _ =>
//                        ProducerPlanGenerator.make(
//                            getPayload = _ => _ => Array(0.toByte)
//                        ),
//                    getSchemaInfos = getSchemaInfos
//                ),
//                TopicPlanGenerator.make(
//                    getTenant = () => tenantName,
//                    getNamespace = () => namespaceName,
//                    getName = topicIndex => s"$topicIndex-bool-sequence",
//                    getProducerGenerator = _ =>
//                        ProducerPlanGenerator.make(
//                            getPayload = _ => messageIndex => Array((messageIndex % 2).toByte)
//                        ),
//                    getSchemaInfos = getSchemaInfos
//                ),
//                TopicPlanGenerator.make(
//                    getTenant = () => tenantName,
//                    getNamespace = () => namespaceName,
//                    getName = topicIndex => s"$topicIndex-bool-random",
//                    getProducerGenerator = _ =>
//                        ProducerPlanGenerator.make(
//                            getPayload = _ => _ => if faker.bool().bool then Array(1.toByte) else Array(0.toByte)
//                        ),
//                    getSchemaInfos = getSchemaInfos
//                ),
                TopicPlanGenerator.make(
                    getTenant = () => tenantName,
                    getNamespace = () => namespaceName,
                    getName = topicIndex => s"$topicIndex-bool-sequence-1000-mps",
                    getPartitioning = _ => Partitioned(3),
                    getProducersCount = _ => 1,
                    getProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            getPayload = _ => messageIndex => if (messageIndex % 2 == 0) then Array(1.toByte) else Array(0.toByte),
                            getKey = _ => _ => Some("const-key"),
                            getSchedule = _ => Schedule.fixed(Duration.fromMillis(1))
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

def getTenantPlan = for {
    tenantPlanGenerator <- getTenantPlanGenerator
    tenantPlan <- TenantPlan.make(tenantPlanGenerator, 0)
} yield tenantPlan
