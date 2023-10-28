package demo.tenants.schemas.namespaces

import _root_.client.adminClient
import generators.*
import zio.{Duration, Schedule}
import conversions.Conversions.int64ToBytes
import scala.jdk.CollectionConverters.*

object StringNamespace:
    def mkPlanGenerator = (tenantName: String) =>
        val namespaceName = "STRING"
        val mkSchemaInfos = (_: TopicIndex) => List(org.apache.pulsar.client.api.Schema.STRING.getSchemaInfo)
        val topicPlanGenerators =
            List(
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"empty-strings",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload = _ => _ => "".getBytes("UTF-8")
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"visible-utf-8-chars",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload = _ => messageIndex => VisibleUtf8CharsAsBytes(messageIndex.toInt)
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"random-characters",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload = _ => _ => charsToBytes(Array(faker.lorem().character()))
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"random-words",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload = _ => _ => faker.lorem().word().getBytes("UTF-8")
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
//                TopicPlanGenerator.make(
//                    mkTenant = () => tenantName,
//                    mkNamespace = () => namespaceName,
//                    mkName = _ => s"random-words-100-mps",
//                    mkProducerGenerator = _ =>
//                        ProducerPlanGenerator.make(
//                            mkPayload = _ => _ => faker.lorem().word().getBytes("UTF-8"),
//                            mkSchedule = _ => Schedule.fixed(Duration.fromMillis(10))
//                        ),
//                    mkSchemaInfos = mkSchemaInfos
//                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"random-sentences",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload = _ => _ => faker.lorem().sentence().getBytes("UTF-8")
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"random-paragraphs",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload = _ => _ => faker.lorem().paragraph().getBytes("UTF-8")
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"random-texts",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload =
                                _ => _ => faker.lorem().paragraphs(10).asScala.mkString("\n\n").getBytes("UTF-8")
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"random-big-texts",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload =
                                _ => _ => faker.lorem().paragraphs(100).asScala.mkString("\n\n").getBytes("UTF-8")
                        ),
                    mkSchemaInfos = mkSchemaInfos
                )
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

// Source: https://stackoverflow.com/a/66111871/4182882
def VisibleUtf8Chars: String =
    val codePoints = new Array[Int](Character.MAX_CODE_POINT + 1)
    var count: Int = 0
    for (codePoint <- codePoints.indices)
        Character.getType(codePoint) match {
            case Character.UNASSIGNED          =>
            case Character.CONTROL             => // Cc
            case Character.FORMAT              => // Cf
            case Character.PRIVATE_USE         => // Co
            case Character.SURROGATE           => // Cs
            case Character.SPACE_SEPARATOR     => // Zs
            case Character.LINE_SEPARATOR      => // Zl
            case Character.PARAGRAPH_SEPARATOR => // Zp
            // Skip

            case _ =>
                codePoints {
                    count += 1;
                    count - 1
                } = codePoint
        }
    new String(codePoints, 0, count)

def VisibleUtf8CharsAsBytes: List[Array[Byte]] =
    VisibleUtf8Chars.toList.map(char => charsToBytes(Array(char)))

def charsToBytes(chars: Array[Char]): Array[Byte] =
    import java.nio.CharBuffer
    import java.nio.ByteBuffer
    import java.nio.charset.Charset
    import java.util.Arrays

    val charBuffer = CharBuffer.wrap(chars)
    val byteBuffer = Charset.forName("UTF-8").encode(charBuffer)
    val bytes = Arrays.copyOfRange(byteBuffer.array, byteBuffer.position, byteBuffer.limit)
    Arrays.fill(byteBuffer.array, 0.toByte) // clear sensitive data

    bytes
