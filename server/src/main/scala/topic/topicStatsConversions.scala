package topic

import org.apache.pulsar.common.policies.data.{
    CompactionStats,
    ConsumerStats,
    PartitionedTopicStats,
    PublisherStats,
    ReplicatorStats,
    SubscriptionStats,
    TopicStats,
}
import org.apache.pulsar.client.api.ProducerAccessMode
import com.tools.teal.pulsar.ui.topic.v1.topic as pb
import scala.jdk.CollectionConverters.*

def topicStatsToPb(stats: TopicStats): pb.TopicStats =
    Option(stats).map(stats =>
        pb.TopicStats(
            msgRateIn = Option(stats.getMsgRateIn),
            msgThroughputIn = Option(stats.getMsgThroughputIn),
            msgRateOut = Option(stats.getMsgRateOut),
            msgThroughputOut = Option(stats.getMsgThroughputOut),
            bytesInCounter = Option(stats.getBytesInCounter),
            msgInCounter = Option(stats.getMsgInCounter),
            bytesOutCounter = Option(stats.getBytesOutCounter),
            msgOutCounter = Option(stats.getMsgOutCounter),
            averageMsgSize = Option(stats.getAverageMsgSize),
            isMsgChunkPublished = Option(stats.isMsgChunkPublished),
            storageSize = Option(stats.getStorageSize),
            backlogSize = Option(stats.getBacklogSize),
            earliestMsgPublishTimeInBacklogs = Option(stats.getEarliestMsgPublishTimeInBacklogs),
            offloadedStorageSize = Option(stats.getOffloadedStorageSize),
            publishers = Option(stats.getPublishers)
                .map(_.asScala)
                .getOrElse(Seq.empty)
                .map(publisherStatsToPb)
                .toSeq,
            waitingPublishers = Option(stats.getWaitingPublishers),
            subscriptions = Option(stats.getSubscriptions)
                .map(_.asScala.view.mapValues(subscriptionStatsToPb).toMap)
                .getOrElse(Map.empty),
            replication = Option(stats.getReplication)
                .map(_.asScala.view.mapValues(replicationStatsToPb).toMap)
                .getOrElse(Map.empty),
            deduplicationStatus = Option(stats.getDeduplicationStatus),
            topicEpoch = Option(stats.getTopicEpoch),
            nonContiguousDeletedMessagesRanges = Option(stats.getNonContiguousDeletedMessagesRanges),
            nonContiguousDeletedMessagesRangesSerializedSize = Option(stats.getNonContiguousDeletedMessagesRangesSerializedSize),
            compaction = Option(stats.getCompaction).map(compactionStatsToPb),
            ownerBroker = Option(stats.getOwnerBroker),
            delayedMessageIndexSizeInBytes = Option(stats.getDelayedMessageIndexSizeInBytes)
        )
    ).getOrElse(pb.TopicStats())

def partitionedTopicStatsToPb(stats: PartitionedTopicStats): pb.PartitionedTopicStats =
    Option(stats).map(stats =>
        pb.PartitionedTopicStats(
            metadata = Option(stats.getMetadata).map(partitionedTopicMetadataToPb),
            stats = Option(topicStatsToPb(stats)),
            partitions = Option(stats.getPartitions)
                .map(_.asScala.toMap)
                .map(_.view.mapValues(topicStatsToPb).toMap)
                .getOrElse(Map.empty)
        )
    ).getOrElse(pb.PartitionedTopicStats())

def compactionStatsToPb(stats: CompactionStats): pb.CompactionStats =
    Option(stats).map(stats =>
        pb.CompactionStats(
            lastCompactionRemovedEventCount = Option(stats.getLastCompactionRemovedEventCount),
            lastCompactionSucceedTimestamp = Option(stats.getLastCompactionSucceedTimestamp),
            lastCompactionFailedTimestamp = Option(stats.getLastCompactionFailedTimestamp),
            lastCompactionDurationTimeInMills = Option(stats.getLastCompactionDurationTimeInMills)
        )
    ).getOrElse(pb.CompactionStats())

def replicationStatsToPb(stats: ReplicatorStats): pb.ReplicatorStats =
    Option(stats).map(stats =>
        pb.ReplicatorStats(
            msgRateIn = Option(stats.getMsgRateIn),
            msgThroughputIn = Option(stats.getMsgThroughputIn),
            msgRateOut = Option(stats.getMsgRateOut),
            msgThroughputOut = Option(stats.getMsgThroughputOut),
            msgRateExpired = Option(stats.getMsgRateExpired),
            replicationBacklog = Option(stats.getReplicationBacklog),
            isConnected = Option(stats.isConnected),
            replicationDeleyInSeconds = Option(stats.getReplicationDelayInSeconds),
            inboundConnection = Option(stats.getInboundConnection),
            inboundConnectedSince = Option(stats.getInboundConnectedSince),
            outboundConnection = Option(stats.getOutboundConnection),
            outboundConnectedSince = Option(stats.getOutboundConnectedSince)
        )
    ).getOrElse(pb.ReplicatorStats())

def subscriptionStatsToPb(stats: SubscriptionStats): pb.SubscriptionStats =
    Option(stats).map(stats =>
        pb.SubscriptionStats(
            msgRateOut = Option(stats.getMsgRateOut),
            msgThroughputOut = Option(stats.getMsgThroughputOut),
            bytesOutCounter = Option(stats.getBytesOutCounter),
            msgOutCounter = Option(stats.getMsgOutCounter),
            msgRateRedeliver = Option(stats.getMsgRateRedeliver),
            messageAckRate = Option(stats.getMessageAckRate),
            chunkedMessageRate = Option(stats.getChunkedMessageRate),
            msgBacklog = Option(stats.getMsgBacklog),
            backlogSize = Option(stats.getBacklogSize),
            earliestMsgPublishTimeInBacklog = Option(stats.getEarliestMsgPublishTimeInBacklog),
            msgBacklogNoDelayed = Option(stats.getMsgBacklogNoDelayed),
            isBlockedSubscriptionOnUnackedMsgs = Option(stats.isBlockedSubscriptionOnUnackedMsgs),
            msgDelayed = Option(stats.getMsgDelayed),
            unackedMessages = Option(stats.getUnackedMessages),
            `type` = Option(stats.getType),
            activeConsumerName = Option(stats.getActiveConsumerName),
            msgRateExpired = Option(stats.getMsgRateExpired),
            totalMsgExpired = Option(stats.getTotalMsgExpired),
            lastExpireTimestamp = Option(stats.getLastExpireTimestamp),
            lastConsumedFlowTimestamp = Option(stats.getLastConsumedFlowTimestamp),
            lastConsumedTimestamp = Option(stats.getLastConsumedTimestamp),
            lastAckedTimestamp = Option(stats.getLastAckedTimestamp),
            lastMarkDeleteAdvancedTimestamp = Option(stats.getLastMarkDeleteAdvancedTimestamp),
            consumers = Option(stats.getConsumers)
                .map(_.asScala)
                .getOrElse(Seq.empty)
                .map(consumerStatsToPb)
                .toSeq,
            isDurable = Option(stats.isDurable),
            isReplicated = Option(stats.isReplicated),
            isAllowOutOfOrderDelivery = Option(stats.isAllowOutOfOrderDelivery),
            keySharedMode = Option(stats.getKeySharedMode),
            consumersAfterMarkDeletePosition = Option(stats.getConsumersAfterMarkDeletePosition)
                .map(_.asScala.toMap)
                .getOrElse(Map.empty),
            subscriptionProperties = Option(stats.getSubscriptionProperties)
                .map(_.asScala.toMap)
                .getOrElse(Map.empty),
            nonContiguousDeletedMessagesRanges = Option(stats.getNonContiguousDeletedMessagesRanges),
            nonContiguousDeletedMessagesRangesSerializedSize = Option(stats.getNonContiguousDeletedMessagesRangesSerializedSize),
            filterProcessedMsgCount = Option(stats.getFilterProcessedMsgCount),
            filterAcceptedMsgCount = Option(stats.getFilterAcceptedMsgCount),
            filterRejectedMsgCount = Option(stats.getFilterRejectedMsgCount),
            filterRescheduledMsgCount = Option(stats.getFilterRescheduledMsgCount),
            delayedMessageIndexSizeInBytes = Option(stats.getDelayedMessageIndexSizeInBytes)
        )
    ).getOrElse(pb.SubscriptionStats())

def consumerStatsToPb(stats: ConsumerStats): pb.ConsumerStats =
    Option(stats).map(stats =>
        pb.ConsumerStats(
            msgRateOut = Option(stats.getMsgRateOut),
            msgThroughputOut = Option(stats.getMsgThroughputOut),
            bytesOutCounter = Option(stats.getBytesOutCounter),
            msgOutCounter = Option(stats.getMsgOutCounter),
            msgRateRedeliver = Option(stats.getMsgRateRedeliver),
            messageAckRate = Option(stats.getMessageAckRate),
            chunkedMessageRate = Option(stats.getChunkedMessageRate),
            consumerName = Option(stats.getConsumerName),
            availablePermits = Option(stats.getAvailablePermits),
            unackedMessages = Option(stats.getUnackedMessages),
            avgMessagesPerEntry = Option(stats.getAvgMessagesPerEntry),
            isBlockedConsumerOnUnackedMsgs = Option(stats.isBlockedConsumerOnUnackedMsgs),
            readPositionWhenJoining = Option(stats.getReadPositionWhenJoining),
            address = Option(stats.getAddress),
            connectedSince = Option(stats.getConnectedSince),
            clientVersion = Option(stats.getClientVersion),
            lastAckedTimestamp = Option(stats.getLastAckedTimestamp),
            lastConsumedTimestamp = Option(stats.getLastConsumedTimestamp),
            lastConsumedFlowTimestamp = Option(stats.getLastConsumedFlowTimestamp),
            keyHashRanges = Option(stats.getKeyHashRanges)
                .map(_.asScala)
                .getOrElse(Seq.empty)
                .toSeq,
            metadata = Option(stats.getMetadata)
                .map(_.asScala.toMap)
                .getOrElse(Map.empty)
        )
    ).getOrElse(pb.ConsumerStats())

def producerAccessModeToPb(accessMode: ProducerAccessMode): pb.ProducerAccessMode = accessMode match
    case ProducerAccessMode.Shared               => pb.ProducerAccessMode.PRODUCER_ACCESS_MODE_SHARED
    case ProducerAccessMode.Exclusive            => pb.ProducerAccessMode.PRODUCER_ACCESS_MODE_EXCLUSIVE
    case ProducerAccessMode.ExclusiveWithFencing => pb.ProducerAccessMode.PRODUCER_ACCESS_MODE_EXCLUSIVE_WITH_FENCING
    case ProducerAccessMode.WaitForExclusive     => pb.ProducerAccessMode.PRODUCER_ACCESS_MODE_WAIT_FOR_EXCLUSIVE

def publisherStatsToPb(stats: PublisherStats): pb.PublisherStats =
    Option(stats).map(stats =>
        pb.PublisherStats(
            accessMode = Option(stats.getAccessMode)
                .map(producerAccessModeToPb)
                .getOrElse(pb.ProducerAccessMode.PRODUCER_ACCESS_MODE_UNSPECIFIED),
            msgRateIn = Option(stats.getMsgRateIn),
            msgThroughputIn = Option(stats.getMsgThroughputIn),
            averageMsgSize = Option(stats.getAverageMsgSize),
            chunkedMessageRate = Option(stats.getChunkedMessageRate),
            producerId = Option(stats.getProducerId),
            isSupportsPartialProducer = Option(stats.isSupportsPartialProducer),
            producerName = Option(stats.getProducerName),
            address = Option(stats.getAddress),
            connectedSince = Option(stats.getConnectedSince),
            clientVersion = Option(stats.getClientVersion),
            metadata = Option(stats.getMetadata)
                .map(_.asScala.toMap)
                .getOrElse(Map.empty)
        )
    ).getOrElse(pb.PublisherStats())
