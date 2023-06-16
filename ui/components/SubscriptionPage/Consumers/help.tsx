import { ReactNode } from "react";
import { ColumnKey } from "./Consumers";

export const help: Record<ColumnKey, ReactNode> = {
  address: "The IP address and source port for the connection of this consumer.",
  availablePermits: (
    <div>
      The number of messages that the consumer has space for in the client library's listening queue.
      <code>0</code> means the client library's queue is full and <code>receive()</code> isn't called.
      A non-zero value means this consumer is ready for dispatched messages.
    </div>
  ),
  avgMessagesPerEntry: "The number of average messages per entry for the consumer consumed.",
  bytesOutCounter: "The total bytes delivered to a consumer.",
  chunkedMessageRate: "The total rate of chunked messages delivered to this consumer.",
  clientVersion: "The client library version of this consumer.",
  connectedSince: "The timestamp when this consumer is created or reconnected last time.",
  consumerName: "The name of this consumer.",
  isBlockedConsumerOnUnackedMsgs: "Flag to verify if consumer is blocked due to reaching threshold of unacked messages.",
  keyHashRanges: "The hash ranges assigned to this consumer if it uses Key_Shared sub mode.",
  lastAckedTimestamp: "The timestamp when the consumer acknowledges a message the last time.",
  lastConsumedFlowTimestamp: "Last received consume flow command timestamp.",
  lastConsumedTimestamp: "Last consume message timestamp.",
  messageAckRate: "Total rate of messages ack.",
  metadata: "The metadata (key/value strings) associated with this consumer.",
  msgOutCounter: "The total messages delivered to a consumer.",
  msgRateOut: "The total rate of messages (message per second) delivered to the consumer.",
  msgRateRedeliver: "The total rate of messages redelivered by this consumer (message per second).",
  msgThroughputOut: "The total throughput (byte per second) delivered to the consumer.",
  readPositionWhenJoining: "The read position of the cursor when the consumer joins.",
  unackedMessages: "The number of unacknowledged messages for the consumer, where an unacknowledged message has been sent to the consumer but not yet acknowledged. " +
    "This field is only meaningful when using a subscription that tracks individual message acknowledgment."
};
