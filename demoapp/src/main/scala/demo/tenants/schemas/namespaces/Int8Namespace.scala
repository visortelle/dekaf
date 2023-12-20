package demo.tenants.schemas.namespaces

import generators.*
import zio.{Duration, Schedule}
import net.datafaker.Faker
import _root_.client.adminClient
import conversions.Conversions.int8ToBytes

object Int8Namespace:
    def mkPlanGenerator = (tenantName: String) =>
        val namespaceName = "INT8"
        val mkSchemaInfos = (_: TopicIndex) => List(org.apache.pulsar.client.api.Schema.INT8.getSchemaInfo)
        val topicPlanGenerators =
            List(
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"zeros",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkMessage = _ => _ => Message(int8ToBytes(0))
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
//                TopicPlanGenerator.make(
//                    mkTenant = () => tenantName,
//                    mkNamespace = () => namespaceName,
//                    mkName = _ => s"zeros-100-mps",
//                    mkProducerGenerator = _ =>
//                        ProducerPlanGenerator.make(
//                            mkMessage = _ => _ => Message(int8ToBytes(0),
//                            mkSchedule = _ => Schedule.fixed(Duration.fromMillis(10))
//                        ),
//                    mkSchemaInfos = mkSchemaInfos
//                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"max-values",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                          mkMessage = _ => _ => Message(int8ToBytes(Byte.MaxValue))
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"min-values",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                          mkMessage = _ => _ => Message(int8ToBytes(Byte.MinValue))
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"linear",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                          mkMessage = _ => messageIndex => Message(int8ToBytes(messageIndex.toByte))
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
//                TopicPlanGenerator.make(
//                    mkTenant = () => tenantName,
//                    mkNamespace = () => namespaceName,
//                    mkName = _ => s"linear-100-mps",
//                    mkProducerGenerator = _ =>
//                        ProducerPlanGenerator.make(
//                            mkMessage = _ => messageIndex => Message(int8ToBytes(messageIndex.toByte),
//                            mkSchedule = _ => Schedule.fixed(Duration.fromMillis(10))
//                        ),
//                    mkSchemaInfos = mkSchemaInfos
//                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"random",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                          mkMessage = _ => _ => 
                            Message(int8ToBytes(faker.number().numberBetween(Byte.MinValue, Byte.MaxValue).toByte))
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
//                TopicPlanGenerator.make(
//                    mkTenant = () => tenantName,
//                    mkNamespace = () => namespaceName,
//                    mkName = _ => s"random-100-mps",
//                    mkProducerGenerator = _ =>
//                        ProducerPlanGenerator.make(
//                            mkMessage = _ => _ =>
//                              Message(int8ToBytes(faker.number().numberBetween(Byte.MinValue, Byte.MaxValue).toByte))
//                            mkSchedule = _ => Schedule.fixed(Duration.fromMillis(10))
//                        ),
//                    mkSchemaInfos = mkSchemaInfos
//                )
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
