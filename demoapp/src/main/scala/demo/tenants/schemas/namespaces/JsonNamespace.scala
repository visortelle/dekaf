package demo.tenants.schemas.namespaces

import _root_.client.adminClient
import generators.*
import org.apache.pulsar.client.impl.schema.JSONSchema
import zio.{Duration, Schedule, Task}

class SimpleObject(
  val x: Int,
  val y: Int
)

class JsonDemoObject(
  val `null`: Null,
  val boolean: Boolean,
  val number: Float,
  val string: String,
  val `object`: SimpleObject,
  val array: Array[Float]
)

object JsonDemoObject:
  def random(): JsonDemoObject = new JsonDemoObject(
    `null` = null,
    boolean = faker.bool().bool(),
    number = faker.random().nextFloat(),
    string = faker.name().name(),
    `object` = new SimpleObject(
      x = faker.random().nextInt(),
      y = faker.random().nextInt()
    ),
    array = Array
      .fill(faker.number().numberBetween(0, 10))(faker.random().nextFloat())
  )

object JsonNamespace:
  def mkPlanGenerator = (tenantName: String) =>
    val namespaceName = "JSON"

    val jsonDemoObjectSchema = JSONSchema.of(classOf[JsonDemoObject])

    val getHighLoadTopics: List[Task[TopicPlanGenerator]] =
      client.config.schemasConfig.flatMap(_.enableHighLoadTopics).filter(identity).map(_ =>
        List(
          TopicPlanGenerator.make(
            mkTenant = () => tenantName,
            mkNamespace = () => namespaceName,
            mkName = _ => s"objects-100-mps",
            mkProducerGenerator = _ =>
              ProducerPlanGenerator.make(
                mkMessage = _ => _ =>
                  Message(Serde.toJsonBytes(JsonDemoObject.random())),
                mkSchedule = _ => Schedule.fixed(Duration.fromMillis(10))
              ),
            mkSchemaInfos = _ => List(jsonDemoObjectSchema.getSchemaInfo)
          )
        )
      ).getOrElse(List())

    val topicPlanGenerators =
      List(
        TopicPlanGenerator.make(
          mkTenant = () => tenantName,
          mkNamespace = () => namespaceName,
          mkName = _ => s"objects",
          mkProducerGenerator = _ =>
            ProducerPlanGenerator.make(
              mkMessage = _ => _ =>
                Message(Serde.toJsonBytes(JsonDemoObject.random()))
            ),
          mkSchemaInfos = _ => List(jsonDemoObjectSchema.getSchemaInfo)
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
