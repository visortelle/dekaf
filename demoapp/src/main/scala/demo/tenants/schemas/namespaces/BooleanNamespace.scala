package demo.tenants.schemas.namespaces

import generators.*
import zio.{Duration, Schedule, Task}
import _root_.client.adminClient

object BooleanNamespace:
    def mkPlanGenerator = (tenantName: String) =>
        val namespaceName = "BOOLEAN"

        val mkSchemaInfos = (_: TopicIndex) => List(org.apache.pulsar.client.api.Schema.BOOL.getSchemaInfo)

        val getHighLoadTopics: List[Task[TopicPlanGenerator]] =
            client.config.schemasConfig
                .flatMap(_.enableHighLoadTopics)
                .filter(identity)
                .map(_ =>
                    List(
                        TopicPlanGenerator.make(
                            mkTenant = () => tenantName,
                            mkNamespace = () => namespaceName,
                            mkName = _ => s"trues-100-mps",
                            mkProducerGenerator = _ =>
                                ProducerPlanGenerator.make(
                                    mkMessage = _ => _ => Message(Array(1.toByte)),
                                    mkSchedule = _ => Schedule.fixed(Duration.fromMillis(10))
                                ),
                            mkSchemaInfos = mkSchemaInfos
                        ),
                        TopicPlanGenerator.make(
                            mkTenant = () => tenantName,
                            mkNamespace = () => namespaceName,
                            mkName = _ => s"falses-100-mps",
                            mkProducerGenerator = _ =>
                                ProducerPlanGenerator.make(
                                    mkMessage = _ => _ => Message(Array(0.toByte)),
                                    mkSchedule = _ => Schedule.fixed(Duration.fromMillis(10))
                                ),
                            mkSchemaInfos = mkSchemaInfos
                        ),
                        TopicPlanGenerator.make(
                            mkTenant = () => tenantName,
                            mkNamespace = () => namespaceName,
                            mkName = _ => s"tic-tac-100-mps",
                            mkProducersCount = _ => 1,
                            mkProducerGenerator = _ =>
                                ProducerPlanGenerator.make(
                                    mkMessage = _ => messageIndex => Message(Array((messageIndex % 2).toByte)),
                                    mkSchedule = _ => Schedule.fixed(Duration.fromMillis(10))
                                ),
                            mkSchemaInfos = mkSchemaInfos
                        ),
                        TopicPlanGenerator.make(
                            mkTenant = () => tenantName,
                            mkNamespace = () => namespaceName,
                            mkName = _ => s"random-100-mps",
                            mkProducerGenerator = _ =>
                                ProducerPlanGenerator.make(
                                    mkMessage = _ =>
                                        _ => Message(if faker.bool().bool then Array(1.toByte) else Array(0.toByte)),
                                    mkSchedule = _ => Schedule.fixed(Duration.fromMillis(10))
                                ),
                            mkSchemaInfos = mkSchemaInfos
                        )
                    )
                )
                .getOrElse(List())

        val topicPlanGenerators =
            List(
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"trues",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkMessage = _ => _ => Message(Array(1.toByte))
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"falses",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkMessage = _ => _ => Message(Array(0.toByte))
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"tic-tak",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkMessage = _ => messageIndex => Message(Array((messageIndex % 2).toByte))
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"random",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkMessage =
                                _ => _ => Message(if faker.bool().bool then Array(1.toByte) else Array(0.toByte))
                        ),
                    mkSchemaInfos = mkSchemaInfos
                )
            ) ++ getHighLoadTopics

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
