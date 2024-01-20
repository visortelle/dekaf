package demo.tenants.schemas.namespaces

import _root_.client.adminClient

import scala.jdk.CollectionConverters.*
import conversions.Conversions.{float32ToBytes, int64ToBytes}
import generators.*
import org.apache.pulsar.client.impl.schema.ProtobufNativeSchema
import zio.{Duration, Schedule}
import com.tools.teal.pulsar.demoapp.schemas_tenant.v1 as pb
import com.google.protobuf.ByteString

import java.util

object CoffeeEnum:
    def allOptions = List(
        pb.CoffeeEnum.COFFEE_ENUM_UNSPECIFIED,
        pb.CoffeeEnum.COFFEE_ENUM_ESPRESSO,
        pb.CoffeeEnum.COFFEE_ENUM_AMERICANO,
        pb.CoffeeEnum.COFFEE_ENUM_CAPPUCCINO,
        pb.CoffeeEnum.COFFEE_ENUM_FRAPPE,
        pb.CoffeeEnum.COFFEE_ENUM_FLAT_WHITE
    )

object SimpleMessage:
    def random(): pb.SimpleMessage = pb.SimpleMessage
        .newBuilder()
        .setX(faker.random().nextInt())
        .setY(faker.random().nextInt())
        .build()

def mkRandomMap(size: Int): java.util.HashMap[String, java.lang.Long] =
    import java.util.HashMap
    import java.util.Map
    import java.util.Random

    val map = new util.HashMap[String, java.lang.Long]()
    List.range(0, size)
        .foreach(i =>
            map.put(
                s"${faker.lorem().word()}-$i",
                faker.random().nextLong()
            )
        )

    map

object ProtobufNativeDemoMessage:
    def random(): pb.ProtobufNativeDemoMessage =
        val builder = pb.ProtobufNativeDemoMessage
            .newBuilder()
            .setDouble(faker.random().nextDouble())
            .setFloat(faker.random().nextFloat())
            .setInt32(faker.random().nextInt())
            .setInt64(faker.random().nextLong())
            .setUint32(Math.abs(faker.random().nextInt()))
            .setUint64(Math.abs(faker.random().nextLong()))
            .setSint32(faker.random().nextInt())
            .setSint64(faker.random().nextLong())
            .setFixed32(faker.random().nextInt())
            .setFixed64(faker.random().nextLong())
            .setSfixed32(faker.random().nextInt())
            .setSfixed64(faker.random().nextLong())
            .setBool(faker.random().nextBoolean())
            .setString(faker.lorem().word())
            .setBytes(ByteString.copyFrom(faker.random().nextRandomBytes(16)))
            .setEnum(faker.options().nextElement(CoffeeEnum.allOptions.asJava))
            .setNestedMessage(SimpleMessage.random())
            .putAllMap(mkRandomMap(faker.number().numberBetween(0, 10)))
            .addAllRepeated(() =>
                List.tabulate(faker.random().nextInt(0, 10))(_ => faker.lorem().word()).asJava.iterator()
            )

        faker.options().nextElement(List("string", "int32", "bool").asJava) match
            case "string" => builder.setOneofString(faker.lorem().word())
            case "int32"  => builder.setOneofInt32(faker.random().nextInt())
            case "bool"   => builder.setOneofBool(faker.random().nextBoolean())

        builder.build()

object ProtobufNativeNamespace:
    def mkPlanGenerator = (tenantName: String) =>
        val namespaceName = "PROTOBUF_NATIVE"

        val protobufNativeMessageSchema = ProtobufNativeSchema.of(classOf[pb.ProtobufNativeDemoMessage])

        val topicPlanGenerators =
            List(
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"messages",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkMessage = _ => _ => 
                              Message(Serde.toProto(ProtobufNativeDemoMessage.random()))
                        ),
                    mkSchemaInfos = _ => List(protobufNativeMessageSchema.getSchemaInfo)
                ),
//                TopicPlanGenerator.make(
//                    mkTenant = () => tenantName,
//                    mkNamespace = () => namespaceName,
//                    mkName = _ => s"messages-100-mps",
//                    mkProducerGenerator = _ =>
//                        ProducerPlanGenerator.make(
//                            mkMessage = _ => _ => 
//                              Message(Encoders.toProto(ProtobufNativeDemoMessage.random())),
//                            mkSchedule = _ => Schedule.fixed(Duration.fromMillis(10))
//                        ),
//                    mkSchemaInfos = _ => List(protobufNativeMessageSchema.getSchemaInfo)
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
