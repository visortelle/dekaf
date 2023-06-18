import { ReactNode } from "react";
import { ColumnKey } from "./Topics";

export const help: Partial<Record<ColumnKey, ReactNode>> = {
  topicName: "The name of the topic.",
  persistency: (
    <div>
      This identifies the type of topic. Pulsar supports two kind of topics: persistent and non-persistent.
      <br />
      <br />
      With persistent topics, all messages are durably persisted on disks
      (if the broker is not standalone, messages are durably persisted on multiple disks),
      whereas data for non-persistent topics is not persisted to storage disks.
    </div>
  ),
  producersCount: "The number of producers for this topic.",
  subscriptionsCount: "The number of subscriptions for this topic.",
  msgRateIn: "The sum of all local and replication publishers' publish rates (message per second).",
  msgThroughputIn: "The sum of all local and replication publishers' publish rates (byte per second).",
  msgRateOut: "The sum of all local and replication consumers' dispatch rates (message per second).",
  msgThroughputOut: "The sum of all local and replication consumers' dispatch rates (byte per second).",
  averageMsgSize: "The average size (bytes) of messages published within the last interval.",
  storageSize: (
    <div>
      The sum of the ledgers' storage size <strong>in BookKeeper</strong> for a topic (in bytes).
      <br />
      <br />
      <strong>Note: </strong><code>the total storage size of a topic</code> = <code>storageSize</code> + <code>offloadedStorageSize</code>.
    </div>
  ),
  offloadedStorageSize: (
    <div>
      The sum of the storage size <strong>in tiered storage</strong> for a topic (in bytes).
      <br />
      <br />
      Note: <code>the total storage size of a topic</code> = <code>storageSize</code> + <code>offloadedStorageSize</code>.
    </div>
  ),
  earliestMsgPublishTimeInBacklogs: "The publish time of the earliest message in the backlog (in milliseconds).",
  bytesInCounter: "The total bytes published to the topic.",
  msgInCounter: "The total messages published to the topic.",
  bytesOutCounter: "The total bytes delivered to consumers.",
  msgOutCounter: "The total messages delivered to consumers.",
  isMsgChunkPublished: "Topic has chunked message published on it.",
  backlogSize: "The estimated total unconsumed or backlog size (in bytes).",
  waitingPublishers: "The number of publishers waiting in a queue in exclusive access mode.",
  deduplicationStatus: "The status of message deduplication for the topic.",
  topicEpoch: "The topic epoch or empty if not set.",
  nonContiguousDeletedMessagesRanges: "The number of non-contiguous deleted messages ranges.",
  nonContiguousDeletedMessagesRangesSerializedSize: "The serialized size of non-contiguous deleted messages ranges.",
  ownerBroker: "The broker that owns this topic.",
  delayedMessageIndexSizeInBytes: "Delayed message index size.",
  replicatorsCount: "The number of replicators for this topic.",
  partitioning: "Partitioned and non-partitioned topics.",
  partitionsCount: "The number of partitions for this topic.",
};
