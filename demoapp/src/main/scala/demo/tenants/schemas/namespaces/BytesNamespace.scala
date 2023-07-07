package demo.tenants.schemas.namespaces

import _root_.client.adminClient
import generators.*
import zio.{Duration, Schedule, Task}
import conversions.Conversions.int64ToBytes

import scala.jdk.CollectionConverters.*

object BytesNamespace:
    def mkPlanGenerator: String => Task[NamespacePlanGenerator] = (tenantName: String) =>
        val namespaceName = "NONE-or-BYTES"
        val mkSchemaInfos = (_: TopicIndex) => List()
        val topicPlanGenerators =
            List(
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"empty-bytes",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload = _ => _ => Array()
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"zeros",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload = _ => _ => Array(0.toByte)
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"zeros-1k-mps",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload = _ => _ => Array(0.toByte),
                            mkSchedule = _ => Schedule.fixed(Duration.fromMillis(1))
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"random-bytes",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload = _ => _ => faker.random().nextRandomBytes(1)
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"random-single-bytes-1k-mps",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload = _ => _ => faker.random().nextRandomBytes(1),
                            mkSchedule = _ => Schedule.fixed(Duration.fromMillis(1))
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"random-1KB",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload = _ => _ => faker.random().nextRandomBytes(1024)
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"random-1KB-1k-mps",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload = _ => _ => faker.random().nextRandomBytes(1024),
                            mkSchedule = _ => Schedule.fixed(Duration.fromMillis(1))
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"zeros-1KB",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload = _ => _ => kiloByteOfZeros
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"zeros-1KB-1k-mps",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload = _ => _ => kiloByteOfZeros,
                            mkSchedule = _ => Schedule.fixed(Duration.fromMillis(1))
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"zeros-10KB",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload = _ => _ => tenKiloBytesOfZeros
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"zeros-10KB-1k-mps",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload = _ => _ => tenKiloBytesOfZeros,
                            mkSchedule = _ => Schedule.fixed(Duration.fromMillis(1))
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"zeros-100kb",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload = _ => _ => hundredKiloBytesOfZeros
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"zeros-100kb-1k-mps",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload = _ => _ => hundredKiloBytesOfZeros,
                            mkSchedule = _ => Schedule.fixed(Duration.fromMillis(1))
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"zeros-1MB",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload = _ => _ => megaByteOfZeros
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

val kiloByteOfZeros: Array[Byte] = Array.fill(1024)(0.toByte)
val tenKiloBytesOfZeros: Array[Byte] = Array.fill(1024 * 10)(0.toByte)
val hundredKiloBytesOfZeros: Array[Byte] = Array.fill(1024 * 100)(0.toByte)
val megaByteOfZeros: Array[Byte] = Array.fill(1024 * 10)(0.toByte)
