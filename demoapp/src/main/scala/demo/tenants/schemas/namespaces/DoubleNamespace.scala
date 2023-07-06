package demo.tenants.schemas.namespaces

import _root_.client.adminClient
import conversions.Conversions.float64ToBytes
import generators.*
import net.datafaker.Faker
import zio.{Duration, Schedule}

object DoubleNamespace:
    def mkPlanGenerator = (tenantName: String) =>
        val namespaceName = "DOUBLE"
        val mkSchemaInfos = (_: TopicIndex) => List(org.apache.pulsar.client.api.Schema.DOUBLE.getSchemaInfo)
        val topicPlanGenerators =
            List(
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"zeros",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload = _ => _ => float64ToBytes(0)
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"zeros-1k-mps",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload = _ => _ => float64ToBytes(0),
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
                            mkPayload = _ => _ => float64ToBytes(Float.MaxValue)
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"min-values",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload = _ => _ => float64ToBytes(Float.MinValue)
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"linear",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload = _ => messageIndex =>
                              float64ToBytes(messageIndex.toDouble / 1000)
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"linear-1k-mps",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload = _ => messageIndex => float64ToBytes(messageIndex.toDouble / 1000),
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
                                _ => float64ToBytes(faker.random.nextFloat())
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
                                _ => float64ToBytes(faker.random().nextFloat()),
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
