package producer.producer_session_runner

import zio.*
import org.apache.pulsar.client.api.{Producer, ProducerBuilder, PulsarClient}
import org.apache.pulsar.client.admin.{PulsarAdmin, PulsarAdminException}
import _root_.producer.producer_task.ProducerTask
import org.apache.pulsar.client.impl.schema.AutoProduceBytesSchema
import org.apache.pulsar.common.schema.SchemaInfo
import org.graalvm.polyglot.Context
import scala.concurrent.duration

import java.util.concurrent.TimeUnit
import scala.jdk.CollectionConverters.*

case class ProducerTaskRunner(
    taskConfig: ProducerTask,
    polyglotContext: Context,
    producer: Producer[Array[Byte]],
    schemaInfo: Option[SchemaInfo],
    numMessages: Long,
    finishAtMillis: Long,
    intervalNanos: Long
):
    def stop(): Unit =
        producer.close()

    def sendNextMessage(): Unit =
        val messageBuilder = producer.newMessage()
        taskConfig.messageGenerator.generateMessageMut(messageBuilder, polyglotContext, schemaInfo)
        messageBuilder.send()

    def resume(): Unit =
        Unsafe.unsafe { implicit unsafe =>
            ProducerTaskRunner.runtime.unsafe.runOrFork {
                for {
                    _ <- ZIO.attempt {
                        sendNextMessage()
                    }
                        .repeat(Schedule.recurs(numMessages - 1) && Schedule.spaced(intervalNanos.nanos))
                        .unless(finishAtMillis < java.lang.System.currentTimeMillis())
                } yield ()
            }
        }

object ProducerTaskRunner:
    private val runtime = Runtime.default

    def make(
        pulsarClient: PulsarClient,
        adminClient: PulsarAdmin,
        taskConfig: ProducerTask,
        polyglotContext: Context
    ): ProducerTaskRunner =
        val producerConfig = taskConfig.producerConfig
        val producerBuilder: ProducerBuilder[Array[Byte]] =
            pulsarClient.newProducer(new AutoProduceBytesSchema[Array[Byte]])
                .topic(taskConfig.targetTopicFqn)

        producerConfig.batcherBuilder.foreach(v => producerBuilder.batcherBuilder(v.toPulsar))
        producerBuilder.properties(producerConfig.properties.asJava)
        producerConfig.producerName.foreach(producerBuilder.producerName)
        producerConfig.accessMode.foreach(producerBuilder.accessMode)
        producerConfig.addEncryptionKey.foreach(producerBuilder.addEncryptionKey)
        producerConfig.autoUpdatePartitions.foreach(producerBuilder.autoUpdatePartitions)
        producerConfig.autoUpdatePartitionsIntervalNanos.foreach(v => producerBuilder.autoUpdatePartitionsInterval(v, TimeUnit.NANOSECONDS))
        producerConfig.batchingMaxBytes.foreach(producerBuilder.batchingMaxBytes)
        producerConfig.batchingMaxMessages.foreach(producerBuilder.batchingMaxMessages)
        producerConfig.batchingMaxPublishDelayNanos.foreach(v => producerBuilder.batchingMaxPublishDelay(v, TimeUnit.NANOSECONDS))
        producerConfig.blockIfQueueFull.foreach(producerBuilder.blockIfQueueFull)
        producerConfig.chunkMaxMessageSize.foreach(producerBuilder.chunkMaxMessageSize)
        producerConfig.compressionType.foreach(producerBuilder.compressionType)
        
        if producerConfig.defaultCryptoKeyReader.nonEmpty then
            producerBuilder.defaultCryptoKeyReader(producerConfig.defaultCryptoKeyReader.asJava)
            
        producerConfig.enableBatching.foreach(producerBuilder.enableBatching)
        producerConfig.enableChunking.foreach(producerBuilder.enableChunking)
        producerConfig.enableLazyStartPartitionedProducers.foreach(producerBuilder.enableLazyStartPartitionedProducers)
        producerConfig.hashingScheme.foreach(producerBuilder.hashingScheme)
        producerConfig.initialSequenceId.foreach(producerBuilder.initialSequenceId)
        producerConfig.maxPendingMessages.foreach(producerBuilder.maxPendingMessages)
        producerConfig.messageRoutingMode.foreach(producerBuilder.messageRoutingMode)
        producerConfig.roundRobinRouterBatchingPartitionSwitchFrequency.foreach(producerBuilder.roundRobinRouterBatchingPartitionSwitchFrequency)
        producerConfig.sendTimeoutNanos.foreach(v => producerBuilder.sendTimeout(v, TimeUnit.NANOSECONDS))

        val producer = producerBuilder.create()

        val schemaInfo: Option[SchemaInfo] =
            try
                Some(adminClient.schemas.getSchemaInfo(producer.getTopic))
            catch {
                case _: PulsarAdminException.NotFoundException => None
            }

        ProducerTaskRunner(
            taskConfig = taskConfig,
            producer = producer,
            schemaInfo = schemaInfo,
            polyglotContext = polyglotContext,

            numMessages = taskConfig.numMessages.getOrElse(1),
            finishAtMillis = taskConfig.limitDurationNanos.map { v =>
                java.lang.System.currentTimeMillis() + duration.Duration(v, TimeUnit.NANOSECONDS).toMillis
            }.getOrElse(
                java.lang.System.currentTimeMillis() + duration.Duration(2, TimeUnit.MINUTES).toMillis
            ),
            intervalNanos = taskConfig.intervalNanos.getOrElse(0)
        )
