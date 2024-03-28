package producer.producer_session_runner

import org.apache.pulsar.client.api.{Producer, ProducerBuilder, PulsarClient}
import _root_.producer.producer_task.ProducerTask
import org.apache.pulsar.client.impl.schema.AutoProduceBytesSchema

import java.util.concurrent.TimeUnit
import scala.jdk.CollectionConverters.*

case class ProducerTaskRunner(
    taskConfig: ProducerTask,
    var producer: Producer[Array[Byte]]
):
    def cleanup(): Unit =
        producer.close()

object ProducerTaskRunner:
    def make(
        pulsarClient: PulsarClient,
        taskConfig: ProducerTask
    ): ProducerTaskRunner =
        val schema = new AutoProduceBytesSchema[Array[Byte]]

        val producerConfig = taskConfig.producerConfig
        val producerBuilder: ProducerBuilder[Array[Byte]] =
            pulsarClient.newProducer(schema)
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
        producerBuilder.defaultCryptoKeyReader(producerConfig.defaultCryptoKeyReader.asJava)
        producerConfig.enableBatching.foreach(producerBuilder.enableBatching)
        producerConfig.enableChunking.foreach(producerBuilder.enableChunking)
        producerConfig.enableLazyStartPartitioningProducers.foreach(producerBuilder.enableLazyStartPartitioningProducers)
        producerConfig.hashingScheme.foreach(producerBuilder.hashingScheme)
        producerConfig.initialSequenceId.foreach(producerBuilder.initialSequenceId)
        producerConfig.maxPendingMessages.foreach(producerBuilder.maxPendingMessages)
        producerConfig.messageRoutingMode.foreach(producerBuilder.messageRoutingMode)
        producerConfig.roundRobinRouterBatchingPartitionSwitchFrequency.foreach(producerBuilder.roundRobinRouterBatchingPartitionSwitchFrequency)
        producerConfig.sendTimeoutNanos.foreach(v => producerBuilder.sendTimeout(v, TimeUnit.NANOSECONDS))
        

        val producer = producerBuilder.create()

        ProducerTaskRunner(
            taskConfig = taskConfig,
            producer = producer
        )
