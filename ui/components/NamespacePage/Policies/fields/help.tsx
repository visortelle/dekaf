import React from "react";

export type TermKey =
  'ledger' |
  'persistentStorage' |
  'bookie' |
  'message' |
  'acknowledgement' |
  'subscription' |
  'topic' |
  'consumer' |
  'schema' |
  'backlog';

export const help: Record<TermKey, React.ReactNode> = {
  ledger: <div>An append-only data structure in BookKeeper that is used to persistently store messages in Pulsar topics. It is used by a Pulsar broker to create and append entries(messages), and once closed, it becomes read-only. The ledger can be deleted when its entries are no longer required.</div>,
  persistentStorage: <div>Mechanism that ensures message delivery by retaining non-acknowledged messages until they are delivered to and acknowledged by consumers.</div>,
  bookie: <div>Bookie is the name of an individual BookKeeper server. It is effectively the storage server of Pulsar.</div>,
  message: <div>Messages are the basic unit of Pulsar. They're what producers publish to topics and what consumers then consume from topics.</div>,
  acknowledgement: <div>A message sent to a Pulsar broker by a consumer that a message has been successfully processed and it can be deleted from the system.</div>,
  subscription: <div>Describes who the consumers of a topic are and how they would like to consume it. Pulsar has four subscription modes (Exclusive, Shared, Failover and Key_Shared).</div>,
  topic: <div>A named channel used to pass messages published by producers to consumers who process those messages.</div>,
  consumer: <div>A process that establishes a subscription to a Pulsar topic and processes messages published to that topic by producers.</div>,
  schema: <div>Metadata that defines how to translate the raw message bytes into a more formal structure type, serving as a protocol between the applications that generate messages and the applications that consume them.</div>,
  backlog: <div>Set of unacknowledged messages for a topic that have been stored by bookies.</div>,
}
