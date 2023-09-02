package demo.tenants.schemas.namespaces

import _root_.client.adminClient
import generators.*
import zio.{Duration, Schedule, Task}
import java.util.{Timer, TimerTask}
import conversions.Conversions.int64ToBytes

import java.time.Instant
import scala.jdk.CollectionConverters.*

inline val KB = 1024
inline val TenKB = 1024 * 10
inline val HundredKB = 1024 * 100
inline val MB = 1024 * 1024

object BytesNamespace:
    var randomBytesChunk: Array[Byte] = Array()
    var randomBytesChunkUpdatedAt: Instant = java.time.Instant.now()
    var randomBytesCache: Map[Int, Array[Byte]] = Map.empty

    private def updateRandomBytesChunk(): Unit =
        randomBytesChunk = faker.random().nextRandomBytes(1024 * 1024)
        randomBytesChunkUpdatedAt = java.time.Instant.now()
        randomBytesCache = Map.empty

    val timer = new Timer()
    timer.scheduleAtFixedRate(
        new TimerTask {
            override def run(): Unit = updateRandomBytesChunk()
        },
        0,
        1000
    )

    // We concatenate same chunks here for better performance.
    // It's a compromise, but it's enough for demo purposes.
    def mkRandomBytes(n: Int): Array[Byte] =
        val cacheEntry = randomBytesCache.get(n)
        if cacheEntry.isDefined then return cacheEntry.get

        if (n <= randomBytesChunk.length) randomBytesChunk.slice(0, n)
        else
            val repetitions = n / randomBytesChunk.length
            val remainder = n % randomBytesChunk.length
            val repeatedBytes = Array.fill(repetitions)(randomBytesChunk).flatten
            val remainingBytes = randomBytesChunk.slice(0, remainder)
            val result = Array.concat(repeatedBytes, remainingBytes)

            randomBytesCache = randomBytesCache + (n -> result)

            result

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
                    mkName = _ => s"min-value",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload = _ => _ => Array(Byte.MinValue)
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"max-values",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload = _ => _ => Array(Byte.MaxValue)
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"random-1B",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload = _ => _ => mkRandomBytes(1)
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"random-1B-100-mps",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload = _ => _ => mkRandomBytes(1),
                            mkSchedule = _ => Schedule.fixed(Duration.fromMillis(10))
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"random-1KB",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload = _ => _ => mkRandomBytes(KB)
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"random-1KB-100-mps",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload = _ => _ => mkRandomBytes(KB),
                            mkSchedule = _ => Schedule.fixed(Duration.fromMillis(10))
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"random-1KB-10k-mps",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload = _ => _ => mkRandomBytes(KB),
                            mkSchedule = _ => Schedule.fixed(Duration.fromNanos(100_000))
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"random-10KB-100-mps",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload = _ => _ => mkRandomBytes(TenKB),
                            mkSchedule = _ => Schedule.fixed(Duration.fromMillis(10))
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"random-100KB-10-mps",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload = _ => _ => mkRandomBytes(HundredKB),
                            mkSchedule = _ => Schedule.fixed(Duration.fromMillis(10))
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"random-1MB",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload = _ => _ => mkRandomBytes(MB)
                        ),
                    mkSchemaInfos = mkSchemaInfos
                ),
                TopicPlanGenerator.make(
                    mkTenant = () => tenantName,
                    mkNamespace = () => namespaceName,
                    mkName = _ => s"random-5MB",
                    mkProducerGenerator = _ =>
                        ProducerPlanGenerator.make(
                            mkPayload = _ => _ => mkRandomBytes(MB * 5)
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
