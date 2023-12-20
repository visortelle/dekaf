package demo.tenants.schemas.namespaces

import _root_.client.adminClient
import conversions.Conversions.int64ToBytes
import generators.*
import net.datafaker.Faker
import zio.{Duration, Schedule}

object Int64Namespace:
    def mkPlanGenerator = (tenantName: String) =>
        val namespaceName = "INT64"
        val mkSchemaInfos = (_: TopicIndex) => List(org.apache.pulsar.client.api.Schema.INT64.getSchemaInfo)
        val topicPlanGenerators =
            List(
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"zeros",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkMessage = _ => _ => 
                              Message(int64ToBytes(0))
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
//                              Message(int64ToBytes(0)),
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
                              Message(int64ToBytes(Long.MaxValue))
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
                              Message(int64ToBytes(Long.MinValue))
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
                              Message(int64ToBytes(messageIndex))
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
//                              Message(int64ToBytes(messageIndex)),
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
                              Message(int64ToBytes(faker.random.nextLong(Long.MinValue, Long.MaxValue)))
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
//                              Message(int64ToBytes(faker.random.nextLong(Long.MinValue, Long.MaxValue))),
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
