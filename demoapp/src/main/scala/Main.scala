import zio.*
import _root_.generators
import _root_.generators.{
    NamespaceIndex,
    NamespacePlan,
    NamespacePlanExecutor,
    NamespacePlanGenerator,
    ProducerPlanGenerator,
    TenantPlan,
    TenantPlanExecutor,
    TenantPlanGenerator,
    TopicPlan,
    TopicPlanExecutor,
    TopicPlanGenerator
}
import org.apache.pulsar.client.impl.schema.{AvroSchema, ProtobufNativeSchema, ProtobufNativeSchemaUtils}
import org.apache.pulsar.common.schema.{SchemaInfo, SchemaType}
import org.apache.commons.lang3.SerializationUtils
import net.datafaker.Faker
val faker = new Faker()

import io.circe.*
import io.circe.syntax.*
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}

class PersonClass(val name: String, val age: Int, val hobbies: List[String])
case class Person(name: String, age: Int, hobbies: List[String])

given personEntryEncoder: Encoder[Person] = deriveEncoder[Person]
given personEntryDecoder: Decoder[Person] = deriveDecoder[Person]

val personSchema = AvroSchema.of(classOf[PersonClass])
val personSchemaInfo = SchemaInfo.builder.`type`(SchemaType.JSON).schema(personSchema.getSchemaInfo.getSchema).build()

val tenantPlanGenerator = {
    val tenantName = s"strange-tenant-${java.time.Instant.now.toEpochMilli.toString}"

    TenantPlanGenerator.make(
        getName = _ => tenantName,
        getNamespacesCount = _ => 5,
        getNamespaceGenerator = namespaceIndex =>
            val namespaceName = s"strange-namespace-${namespaceIndex.toString}"
            NamespacePlanGenerator.make(
                getTenant = () => tenantName,
                getName = _ => namespaceName,
                getTopicsCount = _ => 5,
                getTopicGenerator = _ =>
                    TopicPlanGenerator.make(
                        getTenant = () => tenantName,
                        getNamespace = () => namespaceName,
                        getName = topicIndex => s"strange-topic-${topicIndex.toString}",
                        getProducersCount = _ => 5,
                        getProducerGenerator = _ =>
                            ProducerPlanGenerator.make(
                                getSchedule = _ => Schedule.fixed(Duration.fromMillis(1000)),
                                getPayload = _ => Person(
                                  name = faker.funnyName.name(),
                                  age = faker.number.numberBetween(0, 120),
                                  hobbies = List.tabulate(faker.number.numberBetween(0, 10))(_ => faker.hobby.activity)
                                ).asJson.toString.getBytes("UTF-8")
                            ),
                        getSubscriptionsCount = _ => 5,
                        getSchemaInfo = _ => personSchemaInfo
                    )
            )
    )
}

val tenantPlan = TenantPlan.make(tenantPlanGenerator, 0)

object PulsocatDemoApp extends ZIOAppDefault:
    def run = for {
        _ <- ZIO.logInfo("Starting app...")
        _ <- TenantPlanExecutor.allocateResources(tenantPlan)
        _ <- TenantPlanExecutor.start(tenantPlan)
    } yield ()
