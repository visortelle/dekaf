package demo.tenants.schemas.namespaces

import _root_.client.adminClient
import conversions.Conversions.int32ToBytes
import generators.*
import net.datafaker.Faker
import zio.{Duration, Schedule}

object Int32Namespace:
    def mkPlanGenerator = (tenantName: String) =>
        val namespaceName = "INT32"
        val mkSchemaInfos = (_: TopicIndex) => List(org.apache.pulsar.client.api.Schema.INT32.getSchemaInfo)
        val topicPlanGenerators =
            List(
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"zeros",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkMessage = _ => _ => 
                              Message(int32ToBytes(0))
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
//                TopicPlanGenerator.make(
//                    mkTenant = () => tenantName,
//                    mkNamespace = () => namespaceName,
//                    mkName = _ => s"zeros-100-mps",
//                    mkProducerGenerator = _ =>
//                        ProducerPlanGenerator.make(
//                            mkMessage = _ => _ => 
//                              Message(int32ToBytes(0)),
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
                            mkMessage = _ => _ => 
                              Message(int32ToBytes(Int.MaxValue))
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"min-values",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkMessage = _ => _ => 
                              Message(int32ToBytes(Int.MinValue))
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"linear",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkMessage = _ => messageIndex => 
                              Message(int32ToBytes(messageIndex.toInt))
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
//                TopicPlanGenerator.make(
//                    mkTenant = () => tenantName,
//                    mkNamespace = () => namespaceName,
//                    mkName = _ => s"linear-100-mps",
//                    mkProducerGenerator = _ =>
//                        ProducerPlanGenerator.make(
//                            mkMessage = _ => messageIndex => 
//                              Message(int32ToBytes(messageIndex.toInt)),
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
                              Message(int32ToBytes(faker.number().numberBetween(Int.MinValue, Int.MaxValue)))
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
//                              Message(int32ToBytes(faker.number().numberBetween(Int.MinValue, Int.MaxValue))),
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
