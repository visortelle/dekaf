package demo.tenants.schemas.namespaces

import _root_.client.adminClient
import conversions.Conversions.float64ToBytes
import generators.*
import net.datafaker.Faker
import zio.{Duration, Schedule, Task}

object DoubleNamespace:
  def mkPlanGenerator = (tenantName: String) =>
    val namespaceName = "DOUBLE"

    val mkSchemaInfos = (_: TopicIndex) => List(org.apache.pulsar.client.api.Schema.DOUBLE.getSchemaInfo)

    val getHighLoadTopics: List[Task[TopicPlanGenerator]] =
      client.config.schemasConfig.flatMap(_.enableHighLoadTopics).filter(identity).map(_ =>
        List(
          TopicPlanGenerator.make(
            mkTenant = () => tenantName,
            mkNamespace = () => namespaceName,
            mkName = _ => s"zeros-100-mps",
            mkProducerGenerator = _ =>
              ProducerPlanGenerator.make(
                mkMessage = _ => _ => Message(float64ToBytes(0)),
                  mkSchedule = _ => Schedule.fixed(Duration.fromMillis(10))
                ),
                mkSchemaInfos = mkSchemaInfos
              ),
            TopicPlanGenerator.make(
              mkTenant = () => tenantName,
              mkNamespace = () => namespaceName,
              mkName = _ => s"linear-100-mps",
              mkProducerGenerator = _ =>
                ProducerPlanGenerator.make(
                  mkMessage = _ => messageIndex =>
                    Message(float64ToBytes(messageIndex.toDouble / 1000)),
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
                  mkMessage = _ => _ =>
                    Message(float64ToBytes(faker.random().nextFloat())),
                  mkSchedule = _ => Schedule.fixed(Duration.fromMillis(10))
                ),
              mkSchemaInfos = mkSchemaInfos
            )
        )
      ).getOrElse(List())

    val topicPlanGenerators =
      List(
        TopicPlanGenerator.make(
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => s"zeros",
          mkProducerGenerator = _ =>
            ProducerPlanGenerator.make(
              mkMessage = _ => _ => Message(float64ToBytes(0))
            ),
          mkSchemaInfos = mkSchemaInfos
        ),
        TopicPlanGenerator.make(
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => s"max-values",
          mkProducerGenerator = _ =>
            ProducerPlanGenerator.make(
              mkMessage = _ => _ => Message(float64ToBytes(Float.MaxValue))
            ),
          mkSchemaInfos = mkSchemaInfos
        ),
        TopicPlanGenerator.make(
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => s"min-values",
          mkProducerGenerator = _ =>
            ProducerPlanGenerator.make(
              mkMessage = _ => _ => Message(float64ToBytes(Float.MinValue))
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
                Message(float64ToBytes(messageIndex.toDouble / 1000))
            ),
          mkSchemaInfos = mkSchemaInfos
        ),
        TopicPlanGenerator.make(
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => s"random",
          mkProducerGenerator = _ =>
            ProducerPlanGenerator.make(
              mkMessage = _ => _ =>
                Message(float64ToBytes(faker.random.nextFloat()))
            ),
          mkSchemaInfos = mkSchemaInfos
        ),
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
