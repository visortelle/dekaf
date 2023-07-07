import zio.*
import generators.*
import com.fasterxml.jackson.annotation.PropertyAccessor
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.dataformat.avro.AvroMapper
import com.fasterxml.jackson.dataformat.protobuf.schema.ProtobufSchemaLoader
import com.google.protobuf.GeneratedMessageV3
import demo.schemas.SchemasTenant
import org.apache.pulsar.client.impl.schema.{
    AvroSchema,
    JSONSchema,
    ProtobufNativeSchema,
    ProtobufNativeSchemaUtils,
    ProtobufSchema
}
import org.apache.pulsar.common.schema.{SchemaInfo, SchemaType}
import client.{adminClient, pulsarClient}

import scala.jdk.CollectionConverters.*
import org.apache.pulsar.client.api.schema.SchemaDefinition
import net.datafaker.Faker
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

val personSchemaInfoProtobuf = ProtobufSchema
    .of(classOf[com.tools.teal.pulsar.ui.test.delivery_app.v1.Person])
    .getSchemaInfo

val personSchemaInfoProtobufNative = ProtobufNativeSchema
    .of(classOf[com.tools.teal.pulsar.ui.test.delivery_app.v1.Person])
    .getSchemaInfo

val personSchemaInfoJson = JSONSchema.of(classOf[PersonClass]).getSchemaInfo
val personSchemaInfoAvro = AvroSchema.of(classOf[PersonClass]).getSchemaInfo
//
//_ =>
//  val v = com.tools.teal.pulsar.ui.test.delivery_app.v1.Person.newBuilder()
//    .setName(faker.funnyName.name())
//    .setAge(faker.number.numberBetween(0, 120))
//    .addAllHobbies(() => List.tabulate(faker.number.numberBetween(0, 10))(_ => faker.hobby.activity).asJava.iterator())
//    .build()
//  Encoders.toProto(v)

def mkTenantPlanGenerator = {
    val tenantName = s"strange-tenant-${java.time.Instant.now.toEpochMilli.toString}"

    TenantPlanGenerator.make(
        mkName = _ => tenantName,
        mkNamespacesCount = _ => 1,
        mkNamespaceGenerator = namespaceIndex =>
            val namespaceName = s"strange-namespace-${namespaceIndex.toString}"
            NamespacePlanGenerator.make(
                mkTenant = () => tenantName,
                mkName = _ => namespaceName,
                mkTopicsCount = _ => 1,
                mkTopicGenerator = _ =>
                    TopicPlanGenerator.make(
                        mkTenant = () => tenantName,
                        mkNamespace = () => namespaceName,
                        mkName = topicIndex => s"strange-topic-${topicIndex.toString}",
                        mkProducersCount = _ => 3,
                        mkProducerGenerator = _ =>
                            ProducerPlanGenerator.make(
                                mkSchedule = _ => Schedule.fixed(Duration.fromMillis(100)),
                                mkPayload = _ =>
                                    _ =>
                                        val v = com.tools.teal.pulsar.ui.test.delivery_app.v1.Person
                                            .newBuilder()
                                            .setName(faker.funnyName.name())
                                            .setAge(faker.number.numberBetween(0, 120))
                                            .addAllHobbies(() =>
                                                List.tabulate(faker.number.numberBetween(0, 10))(_ =>
                                                    faker.hobby.activity
                                                ).asJava
                                                    .iterator()
                                            )
                                            .build()
                                        Encoders.toProto(v)
                            ),
                        mkSubscriptionsCount = _ => 3,
                        mkSchemaInfos = _ =>
                            val schema = personSchemaInfoProtobufNative
                            List(schema)
                    )
            )
    )
}

object PulsocatDemoApp extends ZIOAppDefault:
    private def appLogic = for {
        schemasTenantPlan <- SchemasTenant.mkTenantPlan

//        tenantPlanGenerator <- mkTenantPlanGenerator
//        tenantPlan <- TenantPlan.make(tenantPlanGenerator, 0)

        tenantPlans = List(
            schemasTenantPlan
//          tenantPlan
        )

        _ <- ZIO.logInfo("Starting app...")
        _ <- ZIO.foreachParDiscard(tenantPlans)(tenantPlan => TenantPlanExecutor.allocateResources(tenantPlan))
        _ <- ZIO.foreachParDiscard(tenantPlans)(tenantPlan => TenantPlanExecutor.start(tenantPlan))
    } yield ()

    private def cleanup = for {
        _ <- ZIO.attempt(adminClient.close())
        _ <- ZIO.attempt(pulsarClient.close())
    } yield ()

    override def run = appLogic.onExit(_ => ZIO.succeedBlocking(cleanup))
