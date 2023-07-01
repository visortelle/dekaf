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

class Person(val name: String, val age: Int, val hobbies: List[String])

//given personEntryEncoder: Encoder[Person] = deriveEncoder[Person]
//given personEntryDecoder: Decoder[Person] = deriveDecoder[Person]

val personSchema = AvroSchema.of(classOf[Person])
val personSchemaInfo = SchemaInfo.builder.`type`(SchemaType.AVRO).schema(personSchema.getSchemaInfo.getSchema).build()

val tenantPlanGenerator = {
    val tenantName = "strange-tenant-13"

    TenantPlanGenerator.make(
        getName = _ => tenantName,
        getNamespacesCount = _ => 1,
        getNamespaceGenerator = namespaceIndex =>
            val namespaceName = s"strange-namespace-${namespaceIndex.toString}"
            NamespacePlanGenerator.make(
                getTenant = () => tenantName,
                getName = _ => namespaceName,
                getTopicsCount = _ => 1,
                getTopicGenerator = _ =>
                    TopicPlanGenerator.make(
                        getTenant = () => tenantName,
                        getNamespace = () => namespaceName,
                        getName = topicIndex => s"strange-topic-${topicIndex.toString}",
                        getProducersCount = _ => 1,
                        getPayload = _ =>
                            new Person(
                                name = faker.funnyName.name(),
                                age = faker.number.numberBetween(0, 120),
                                hobbies = List.tabulate(faker.number.numberBetween(0, 10))(_ => faker.hobby.activity)
                            ).asInstanceOf[Array[Byte]],
                        getProducerGenerator = _ =>
                            ProducerPlanGenerator.make(
                                getSchedule = _ => Schedule.fixed(Duration.fromMillis(1000))
                            ),
                        getSubscriptionsCount = _ => 3,
                        getSchemaInfo = _ => personSchemaInfo
                    )
            )
    )
}

val tenantPlan = TenantPlan.make(tenantPlanGenerator, 0)

object MainApp extends ZIOAppDefault:
    def run = for {
        _ <- ZIO.logInfo("Starting app...")
        _ <- TenantPlanExecutor.allocateResources(tenantPlan)
        _ <- TenantPlanExecutor.start(tenantPlan)
    } yield ()
