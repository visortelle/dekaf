package demo.tenants.schemas.namespaces

import _root_.client.adminClient
import generators.*
import net.datafaker.Faker
import zio.{Duration, Schedule}
import conversions.Conversions.int16ToBytes

object Int16Namespace:
    def mkPlanGenerator = (tenantName: String) =>
        val namespaceName = "INT16"
        val mkSchemaInfos = (_: TopicIndex) => List(org.apache.pulsar.client.api.Schema.INT16.getSchemaInfo)
        val topicPlanGenerators =
            List(
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"zeros",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload = _ => _ => int16ToBytes(0)
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"zeros-1k-mps",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload = _ => _ => int16ToBytes(0),
                            mkSchedule = _ => Schedule.fixed(Duration.fromMillis(1))
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"max-values",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload = _ => _ => int16ToBytes(Short.MaxValue)
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"min-values",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload = _ => _ => int16ToBytes(Short.MinValue)
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"linear",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload = _ => messageIndex => int16ToBytes(messageIndex.toShort)
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"linear-1k-mps",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload = _ => messageIndex => int16ToBytes(messageIndex.toShort),
                            mkSchedule = _ => Schedule.fixed(Duration.fromMillis(1))
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"random",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload = _ =>
                                _ => int16ToBytes(faker.number().numberBetween(Short.MinValue, Short.MaxValue).toShort)
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"random-1k-mps",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload = _ =>
                                _ => int16ToBytes(faker.number().numberBetween(Short.MinValue, Short.MaxValue).toShort),
                                mkSchedule = _ => Schedule.fixed(Duration.fromMillis(1))
                        ),
                    mkSchemaInfos = mkSchemaInfos
                )
            )

        NamespacePlanGenerator.make(
            mkTenant = () => tenantName,
            mkName = _ => namespaceName,
            mkTopicsCount = _ => topicPlanGenerators.size,
            mkTopicGenerator = topicIndex => topicPlanGenerators(topicIndex),
            mkAfterAllocation = _ => {
                val namespaceFqn = s"$tenantName/$namespaceName"
                adminClient.namespaces.setSchemaValidationEnforced(namespaceFqn, true)
            }
        )
