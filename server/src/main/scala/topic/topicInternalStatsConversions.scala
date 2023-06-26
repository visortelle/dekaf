package topic

import org.apache.pulsar.common.policies.data.ManagedLedgerInternalStats.{CursorStats, LedgerInfo}
import org.apache.pulsar.common.policies.data.{ManagedLedgerInternalStats, PartitionedTopicInternalStats, PersistentTopicInternalStats}
import com.tools.teal.pulsar.ui.topic.v1.topic as topicPb
import org.apache.pulsar.common.partition.PartitionedTopicMetadata

import scala.jdk.CollectionConverters.*
import scala.jdk.OptionConverters.*

def partitionedTopicInternalStatsToPb(stats: PartitionedTopicInternalStats): topicPb.PartitionedTopicInternalStats =
    topicPb.PartitionedTopicInternalStats(
        metadata = Option(stats.metadata).map(partitionedTopicMetadataToPb),
        partitions = Option(stats.partitions)
            .map(_.asScala)
            .getOrElse(Map.empty)
            .toArray
            .map(kv => (kv._1, persistentTopicInternalStatsToPb(kv._2)))
            .toMap
    )

def partitionedTopicMetadataToPb(metadata: PartitionedTopicMetadata): topicPb.PartitionedTopicMetadata =
    topicPb.PartitionedTopicMetadata(
        partitions = Option(metadata.partitions),
        properties = Option(metadata.properties).map(_.asScala.toMap).getOrElse(Map.empty),
        deleted = Option(metadata.deleted)
    )

def persistentTopicInternalStatsToPb(stats: PersistentTopicInternalStats): topicPb.PersistentTopicInternalStats =
    topicPb.PersistentTopicInternalStats(
        managedLedgerInternalStats = Option(managedLedgerInternalStatsToPb(stats)),
        schemaLedgers = Option(stats.schemaLedgers).map(_.asScala.toVector).getOrElse(Vector.empty).map(ledgerInfoToPb),
        compactedLedger = Option(stats.compactedLedger).map(ledgerInfoToPb)
    )

def managedLedgerInternalStatsToPb(stats: ManagedLedgerInternalStats): topicPb.ManagedLedgerInternalStats =
    topicPb.ManagedLedgerInternalStats(
        entriesAddedCounter = Option(stats.entriesAddedCounter),
        numberOfEntries = Option(stats.numberOfEntries),
        totalSize = Option(stats.totalSize),
        currentLedgerEntries = Option(stats.currentLedgerEntries),
        currentLedgerSize = Option(stats.currentLedgerSize),
        lastLedgerCreatedTimestamp = Option(stats.lastLedgerCreatedTimestamp),
        lastLedgerCreationFailureTimestamp = Option(stats.lastLedgerCreationFailureTimestamp),
        waitingCursorsCount = Option(stats.waitingCursorsCount),
        pendingEntriesCount = Option(stats.pendingAddEntriesCount),
        lastConfirmedEntry = Option(stats.lastConfirmedEntry),
        state = Option(stats.state),
        ledgers = Option(stats.ledgers).map(_.asScala.toVector).getOrElse(Vector.empty).map(ledgerInfoToPb),
        cursors = Option(stats.cursors).map(_.asScala).getOrElse(Map.empty).toArray.map(kv => (kv._1, cursorStatsToPb(kv._2))).toMap
    )

def ledgerInfoToPb(info: LedgerInfo): topicPb.LedgerInfo =
    topicPb.LedgerInfo(
        ledgerId = Option(info.ledgerId),
        entries = Option(info.entries),
        size = Option(info.size),
        offloaded = Option(info.offloaded),
        metadata = Option(info.metadata),
        underReplicated = Option(info.underReplicated)
    )

def cursorStatsToPb(cursor: CursorStats): topicPb.CursorStats =
    topicPb.CursorStats(
        markDeletePosition = Option(cursor.markDeletePosition),
        readPosition = Option(cursor.readPosition),
        waitingReadOp = Option(cursor.waitingReadOp),
        pendingReadOps = Option(cursor.pendingReadOps),
        messagesConsumedCounter = Option(cursor.messagesConsumedCounter),
        cursorLedger = Option(cursor.cursorLedger),
        cursorLedgerLastEntry = Option(cursor.cursorLedgerLastEntry),
        individuallyDeletedMessages = Option(cursor.individuallyDeletedMessages),
        lastLedgerSwitchTimestamp = Option(cursor.lastLedgerSwitchTimestamp),
        state = Option(cursor.state),
        active = Option(cursor.active),
        numberOfEntriesSinceFirstNotAckedMessage = Option(cursor.numberOfEntriesSinceFirstNotAckedMessage),
        totalNonContiguousDeletedMessagesRange = Option(cursor.totalNonContiguousDeletedMessagesRange),
        subscriptionHavePendingRead = Option(cursor.subscriptionHavePendingRead),
        subscriptionHavePendingReplayRead = Option(cursor.subscriptionHavePendingReplayRead),
        properties = Option(cursor.properties).map(_.asScala.toMap).getOrElse(Map.empty).toArray.map(kv => (kv._1, kv._2.toLong)).toMap
    )
