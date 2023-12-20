package demo.tenants.schemas.namespaces

import _root_.client.adminClient

import scala.jdk.CollectionConverters.*
import conversions.Conversions.int64ToBytes
import generators.*
import org.apache.pulsar.client.impl.schema.AvroSchema
import zio.{Duration, Schedule}

enum Coffee extends Enum[Coffee]:
    case Espresso, Americano, Cappuccino, Frappe, FlatWhite

class SimpleRecord(
    val x: Int,
    val y: Int
)

class AvroDemoRecord(
    val `null`: Null,
    val boolean: Boolean,
    val int: Int,
    val long: Long,
    val float: Float,
    val double: Double,
    val bytes: Array[Byte],
    val string: String,
    val record: SimpleRecord,
    val `enum`: Coffee,
    val array: Array[Int]
)

object AvroDemoRecord:
    def random(): AvroDemoRecord = new AvroDemoRecord(
        `null` = null,
        boolean = faker.bool().bool(),
        int = faker.random.nextInt(),
        long = faker.random().nextLong(),
        float = faker.random().nextFloat(),
        double = faker.random().nextDouble(),
        bytes = faker.random().nextRandomBytes(faker.number().numberBetween(0, 16)),
        string = faker.name().name(),
        record = new SimpleRecord(
            x = faker.random().nextInt(),
            y = faker.random().nextInt()
        ),
        `enum` = faker
            .options()
            .nextElement(
                List(
                    Coffee.Espresso,
                    Coffee.Americano,
                    Coffee.Cappuccino,
                    Coffee.Frappe,
                    Coffee.FlatWhite
                ).asJava
            ),
        array = Array
            .fill(faker.number().numberBetween(0, 10))(faker.random().nextInt())
    )

object AvroNamespace:
    def mkPlanGenerator = (tenantName: TenantName) =>
        val namespaceName = "AVRO"

        val avroDemoRecordSchema = AvroSchema.of(classOf[AvroDemoRecord])

        val topicPlanGenerators =
            List(
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"records",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkMessage = _ =>
                                _ =>
                                  Message(
                                    Encoders.toAvro(
                                      avroDemoRecordSchema.getSchemaInfo.getSchema,
                                      AvroDemoRecord.random()
                                    )
                                  )
                        ),
                    mkSchemaInfos = _ => List(avroDemoRecordSchema.getSchemaInfo)
                ),
//                TopicPlanGenerator.make(
//                    mkTenant = () => tenantName,
//                    mkNamespace = () => namespaceName,
//                    mkName = _ => s"records-100-mps",
//                    mkProducerGenerator = _ =>
//                        ProducerPlanGenerator.make(
//                            mkPayload = _ =>
//                                _ =>
//                                    Encoders.toAvro(
//                                        avroDemoRecordSchema.getSchemaInfo.getSchema,
//                                        AvroDemoRecord.random()
//                                    ),
//                            mkSchedule = _ => Schedule.fixed(Duration.fromMillis(10))
//                        ),
//                    mkSchemaInfos = _ => List(avroDemoRecordSchema.getSchemaInfo)
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
