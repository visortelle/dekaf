import zio.*
import _root_.generators
import _root_.generators.{NamespaceIndex, NamespacePlan, NamespacePlanExecutor, NamespacePlanGenerator, ProducerPlanGenerator, TenantPlan, TenantPlanExecutor, TenantPlanGenerator, TopicPlan, TopicPlanExecutor, TopicPlanGenerator}
import com.fasterxml.jackson.annotation.PropertyAccessor
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.dataformat.avro.AvroMapper
import com.fasterxml.jackson.dataformat.protobuf.schema.ProtobufSchemaLoader
import com.google.protobuf.GeneratedMessageV3
import org.apache.pulsar.client.impl.schema.{AvroSchema, JSONSchema, ProtobufNativeSchema, ProtobufNativeSchemaUtils}
import org.apache.pulsar.common.schema.{SchemaInfo, SchemaType}

import scala.jdk.CollectionConverters.*
import net.datafaker.Faker
import org.apache.pulsar.client.api.schema.SchemaDefinition
val faker = new Faker()

import io.circe.*
import io.circe.syntax.*
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}

class PersonClass(
    val name: String,
    val age: Int,
    val hobbies: Array[String]
)

case class Person(
    name: String,
    age: Int,
    hobbies: List[String]
)
given personJsonEncoder: Encoder[Person] = deriveEncoder[Person]
given personJsonDecoder: Decoder[Person] = deriveDecoder[Person]

object Encoders:
    import org.apache.avro.Schema
    import com.fasterxml.jackson.dataformat.avro.{AvroFactory, AvroMapper}
    import com.fasterxml.jackson.dataformat.protobuf.ProtobufMapper
    import com.fasterxml.jackson.annotation.PropertyAccessor
    import com.fasterxml.jackson.annotation.JsonAutoDetect.Visibility

    def toJson[T](using encoder: io.circe.Encoder[T])(value: T): Array[Byte] =
        value.asJson.toString.getBytes("UTF-8")

    def toAvro[T](schema: Array[Byte], value: T): Array[Byte] =
        // https://github.com/FasterXML/jackson-dataformats-binary/tree/2.16/avro
        val mapper = new AvroMapper()
        mapper.setVisibility(PropertyAccessor.FIELD, Visibility.ANY)
        val avroSchema = mapper.schemaFrom(schema.map(_.toChar).mkString) // TODO: cache schema
        mapper.writer(avroSchema).writeValueAsBytes(value)

    def toProto[T <: GeneratedMessageV3](value: T): Array[Byte] =
      value.toByteArray

val personSchemaInfoProtobuf = SchemaInfo.builder
    .`type`(SchemaType.PROTOBUF)
    .schema(JSONSchema.of(classOf[PersonClass]).getSchemaInfo.getSchema)
    .build()

val personSchemaInfoProtobufNative = SchemaInfo.builder
    .`type`(SchemaType.PROTOBUF_NATIVE)
    .schema(ProtobufNativeSchema.of(classOf[com.tools.teal.pulsar.ui.test.delivery_app.v1.Person]).getSchemaInfo.getSchema)
    .build()

val personSchemaInfoJson = SchemaInfo.builder
    .`type`(SchemaType.JSON)
    .schema(JSONSchema.of(classOf[PersonClass]).getSchemaInfo.getSchema)
    .build()

val personSchemaInfoAvro = SchemaInfo.builder
    .`type`(SchemaType.AVRO)
    .schema(AvroSchema.of(classOf[PersonClass]).getSchemaInfo.getSchema)
    .build()

val tenantPlanGenerator = {
    val tenantName = s"strange-tenant-${java.time.Instant.now.toEpochMilli.toString}"

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
                        getProducersCount = _ => 3,
                        getProducerGenerator = _ => ProducerPlanGenerator.make(
                            getSchedule = _ => Schedule.fixed(Duration.fromMillis(1000)),
                            getPayload = _ =>
                                val v = com.tools.teal.pulsar.ui.test.delivery_app.v1.Person.newBuilder()
                                  .setName(faker.funnyName.name())
                                  .setAge(faker.number.numberBetween(0, 120))
//                                  .addAllHobbies(() => List.tabulate(faker.number.numberBetween(0, 10))(_ => faker.hobby.activity).asJava.iterator())
                                  .build()
                                Encoders.toProto(v)
                        ),
                        getSubscriptionsCount = _ => 3,
                        getSchemaInfo = _ => personSchemaInfoProtobufNative,
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
