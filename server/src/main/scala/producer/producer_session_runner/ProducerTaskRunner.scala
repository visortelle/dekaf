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

type TopicFqn = String

case class ProducerTaskRunner(
    taskConfig: ProducerTask,
    polyglotContext: Context,
    numMessages: Long,
    limitDurationNanos: Long,
    intervalNanos: Long,
    topicFqns: Vector[TopicFqn] = Vector.empty,
    producers: Map[TopicFqn, Producer[Array[Byte]]],
    schemaInfos: Map[TopicFqn, SchemaInfo]
):
    def stop(): Task[Unit] = ZIO.foreachParDiscard(producers.values) { producer =>
        ZIO.attempt {
            producer.closeAsync()
        }
    }

    def sendNextMessage(): Task[Unit] = ZIO.foreachDiscard(producers.values) { producer =>
        ZIO.attempt {
            val messageBuilder = producer.newMessage()
            val schemaInfo = schemaInfos.get(producer.getTopic)
            taskConfig.messageGenerator.generateMessageMut(messageBuilder, polyglotContext, schemaInfo)
            messageBuilder.sendAsync()
        }
    }

    def resume(): Task[Unit] =

        for {
            _ <- sendNextMessage()
                .repeat(Schedule.recurs(numMessages - 1) && Schedule.spaced(intervalNanos.nanos))
                .disconnect.timeout(Duration.fromNanos(limitDurationNanos))
                .ensuring(ZIO.succeed(stop()))
        } yield ()

object ProducerTaskRunner:
    def make(
        pulsarClient: PulsarClient,
        adminClient: PulsarAdmin,
        taskConfig: ProducerTask,
        polyglotContext: Context
    ): ProducerTaskRunner =
        val topicFqns = taskConfig.topicSelector.getTopics(adminClient)

        def mkProducer(topicFqn: String): Producer[Array[Byte]] =
            val producerBuilder: ProducerBuilder[Array[Byte]] =
                pulsarClient.newProducer(new AutoProduceBytesSchema[Array[Byte]])
                    .topic(topicFqn)

            taskConfig.producerConfig match
                case None =>
                case Some(producerConfig) =>
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

            producerBuilder.create()

        val schemaInfos: Map[TopicFqn, SchemaInfo] = topicFqns.flatMap { topicFqn =>
            try
                Some(topicFqn -> adminClient.schemas.getSchemaInfo(topicFqn))
            catch {
                case _: PulsarAdminException.NotFoundException => None
            }
        }.toMap

        ProducerTaskRunner(
            taskConfig = taskConfig,
            polyglotContext = polyglotContext,
            numMessages = taskConfig.numMessages.getOrElse(1),
            limitDurationNanos = taskConfig.limitDurationNanos.getOrElse(1000_000_000L * 60 * 5),
            intervalNanos = taskConfig.intervalNanos.getOrElse(0),
            topicFqns = topicFqns,
            producers = topicFqns.map(fqn => fqn -> mkProducer(fqn)).toMap,
            schemaInfos = schemaInfos
        )
