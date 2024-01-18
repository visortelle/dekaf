import React from "react";
import A from "./A/A";

export type TermKey =
  'ledger' |
  'persistentStorage' |
  'bookie' |
  'message' |
  'acknowledgement' |
  'subscription' |
  'topic' |
  'consumer' |
  'producer' |
  'schema' |
  'backlog' |
  'throttlingRateMarkDelete' |
  'delayedDelivery' |
  'compactionThreshold' |
  'deduplication' |
  'deduplicationSnapshot' |
  'messagePublishRate' |
  'inactiveTopicPolicies' |
  'dispatchRate' |
  'replicatorDispatchRate' |
  'tenant';

export const help: Partial<Record<TermKey, React.ReactNode>> = {
  ledger: <div>An append-only data structure in BookKeeper that is used to persistently store messages in Pulsar topics. It is used by a Pulsar broker to create and append entries(messages), and once closed, it becomes read-only. The ledger can be deleted when its entries are no longer required.</div>,
  persistentStorage: <div>Mechanism that ensures message delivery by retaining non-acknowledged messages until they are delivered to and acknowledged by consumers.</div>,
  bookie: <div>Bookie is the name of an individual BookKeeper server. It is effectively the storage server of Pulsar.</div>,
  message: <div>Messages are the basic unit of Pulsar. They're what producers publish to topics and what consumers then consume from topics.</div>,
  acknowledgement: <div>A message sent to a Pulsar broker by a consumer that a message has been successfully processed and it can be deleted from the system.</div>,
  subscription: <div>Describes who the consumers of a topic are and how they would like to consume it. Pulsar has four subscription modes (Exclusive, Shared, Failover and Key_Shared).</div>,
  topic: <div>A named channel used to pass messages published by producers to consumers who process those messages.</div>,
  consumer: <div>A process that establishes a subscription to a Pulsar topic and processes messages published to that topic by producers.</div>,
  producer: <div>A process that publishes messages to a Pulsar topic.</div>,
  schema: <div>Metadata that defines how to translate the raw message bytes into a more formal structure type, serving as a protocol between the applications that generate messages and the applications that consume them.</div>,
  backlog: <div>Set of unacknowledged messages for a topic that have been stored by bookies.</div>,
  throttlingRateMarkDelete: <div>Refers to the maximum rate at which acknowledgements (mark-delete operations) can be processed by the broker. This is a form of rate limiting that can be used to prevent overloading the system with too many acknowledgement operations in a short period of time.</div>,
  delayedDelivery: <div>Delayed message delivery enables you to consume a message later. In this mechanism, a message is stored in BookKeeper. This message will be delivered to a consumer once the specified delay is over. For <code>Key_Shared</code> subscription only  </div>,
  compactionThreshold: <div>Compaction threshold policy specifies how large the topic backlog can grow before compaction is triggered.</div>,
  deduplication: <div>Feature that ensures each message produced on Pulsar topics is stored only once, even if the message is produced multiple times. Also enabling of message deduplication could affect the performance of the brokers during informational snapshots.</div>,
  deduplicationSnapshot: <div>Refers to a periodic record taken for the purpose of message deduplication. Snapshot is taken after a certain number of entries or a specific time period to assure <A isExternalLink href={"https://github.com/aahmed-se/pulsar-wiki/blob/master/PIP-6:-Guaranteed-Message-Deduplication.md"}>guaranteed message deduplication</A></div>,
  messagePublishRate: <div>Specifies total rate of messages (message per second) and total throughput (byte per second) of the messages published by this publisher</div>,
  inactiveTopicPolicies: <div>Dictate the handling of topics that lack active producers or consumers. These policies can determine if and when such topics should be deleted due to inactivity. By default, topics are deleted after 60 seconds.</div>,
  tenant: <div>An administrative unit for allocating capacity and enforcing an authentication/authorization scheme.</div>,
}
