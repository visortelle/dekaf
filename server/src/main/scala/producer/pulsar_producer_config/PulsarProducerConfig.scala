package producer.pulsar_producer_config

import com.tools.teal.pulsar.ui.producer.v1.producer as pb
import producer.pulsar_producer_config.access_mode.AccessMode
import producer.pulsar_producer_config.batcher_builder.BatcherBuilder
import producer.pulsar_producer_config.compression_type.CompressionType
import producer.pulsar_producer_config.hashing_scheme.HashingScheme
import producer.pulsar_producer_config.message_routing_mode.MessageRoutingMode

case class PulsarProducerConfig(
    batcherBuilder: Option[BatcherBuilder],
    properties: Map[String, String],
    producerName: Option[String],
    accessMode: Option[AccessMode],
    addEncryptionKey: Option[String],
    autoUpdatePartitions: Option[Boolean],
    autoUpdatePartitionsIntervalNanos: Option[Int],
    batchingMaxBytes: Option[Int],
    batchingMaxMessages: Option[Int],
    batchingMaxPublishDelayNanos: Option[Long],
    blockIfQueueFull: Option[Boolean],
    chunkMaxMessageSize: Option[Int],
    compressionType: Option[CompressionType],
    defaultCryptoKeyReader: Map[String, String],
    enableBatching: Option[Boolean],
    enableChunking: Option[Boolean],
    enableLazyStartPartitionedProducers: Option[Boolean],
    hashingScheme: Option[HashingScheme],
    initialSequenceId: Option[Long],
    maxPendingMessages: Option[Int],
    messageRoutingMode: Option[MessageRoutingMode],
    roundRobinRouterBatchingPartitionSwitchFrequency: Option[Int],
    sendTimeoutNanos: Option[Int],
)

object PulsarProducerConfig:
    def fromPb(v: pb.PulsarProducerConfig): PulsarProducerConfig =
        PulsarProducerConfig(
            batcherBuilder = v.batcherBuilder.map(BatcherBuilder.fromPb),
            properties = v.properties,
            producerName = v.producerName,
            accessMode = Some(AccessMode.fromPb(v.accessMode)),
            addEncryptionKey = v.addEncryptionKey,
            autoUpdatePartitions = v.autoUpdatePartitions,
            autoUpdatePartitionsIntervalNanos = v.autoUpdatePartitionsIntervalNanos,
            batchingMaxBytes = v.batchingMaxBytes,
            batchingMaxMessages = v.batchingMaxMessages,
            batchingMaxPublishDelayNanos = v.batchingMaxPublishDelayNanos,
            blockIfQueueFull = v.blockIfQueueFull,
            chunkMaxMessageSize = v.chunkMaxMessageSize,
            compressionType = Some(CompressionType.fromPb(v.compressionType)),
            defaultCryptoKeyReader = v.defaultCryptoKeyReader,
            enableBatching = v.enableBatching,
            enableChunking = v.enableChunking,
            enableLazyStartPartitionedProducers = v.enableLazyStartPartitionedProducers,
            hashingScheme = Some(HashingScheme.fromPb(v.hashingScheme)),
            initialSequenceId = v.initialSequenceId,
            maxPendingMessages = v.maxPendingMessages,
            messageRoutingMode = Some(MessageRoutingMode.fromPb(v.messageRoutingMode)),
            roundRobinRouterBatchingPartitionSwitchFrequency = v.roundRobinRouterBatchingPartitionSwitchFrequency,
            sendTimeoutNanos = v.sendTimeoutNanos,
        )

    def toPb(v: PulsarProducerConfig): pb.PulsarProducerConfig =
        pb.PulsarProducerConfig(
            batcherBuilder = v.batcherBuilder.map(BatcherBuilder.toPb),
            properties = v.properties,
            producerName = v.producerName,
            accessMode = v.accessMode.map(AccessMode.toPb).getOrElse(pb.AccessMode.ACCESS_MODE_UNSPECIFIED),
            addEncryptionKey = v.addEncryptionKey,
            autoUpdatePartitions = v.autoUpdatePartitions,
            autoUpdatePartitionsIntervalNanos = v.autoUpdatePartitionsIntervalNanos,
            batchingMaxBytes = v.batchingMaxBytes,
            batchingMaxMessages = v.batchingMaxMessages,
            batchingMaxPublishDelayNanos = v.batchingMaxPublishDelayNanos,
            blockIfQueueFull = v.blockIfQueueFull,
            chunkMaxMessageSize = v.chunkMaxMessageSize,
            compressionType = v.compressionType.map(CompressionType.toPb).getOrElse(pb.CompressionType.COMPRESSION_TYPE_UNSPECIFIED),
            defaultCryptoKeyReader = v.defaultCryptoKeyReader,
            enableBatching = v.enableBatching,
            enableChunking = v.enableChunking,
            enableLazyStartPartitionedProducers = v.enableLazyStartPartitionedProducers,
            hashingScheme = v.hashingScheme.map(HashingScheme.toPb).getOrElse(pb.HashingScheme.HASHING_SCHEME_UNSPECIFIED),
            initialSequenceId = v.initialSequenceId,
            maxPendingMessages = v.maxPendingMessages,
            messageRoutingMode = v.messageRoutingMode.map(MessageRoutingMode.toPb).getOrElse(pb.MessageRoutingMode.MESSAGE_ROUTING_MODE_UNSPECIFIED),
            roundRobinRouterBatchingPartitionSwitchFrequency = v.roundRobinRouterBatchingPartitionSwitchFrequency,
            sendTimeoutNanos = v.sendTimeoutNanos
        )
