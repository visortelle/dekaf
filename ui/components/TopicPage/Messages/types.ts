import { ManagedColoringRuleChain, ManagedColoringRuleChainValOrRef } from "../../../grpc-web/tools/teal/pulsar/ui/library/v1/managed_items_pb";
import { ManagedMessageFilterChain, ManagedMessageFilterChainValOrRef, ManagedTopicSelectorValOrRef } from "../../ui/LibraryBrowser/model/user-managed-items";
import { TopicSelector } from "./topic-selector/topic-selector";

export type SessionState =
  | "paused"
  | "pausing"
  | "running"
  | "initializing"
  | "new";

export type DateTimeUnit = 'year' | 'month' | 'week' | 'day' | 'hour' | 'minute' | 'second';

export type RelativeDateTime = {
  value: number,
  unit: DateTimeUnit
  isRoundedToUnitStart: boolean
};

export type ColoringRule = {
  messageFilterChain: MessageFilterChain;
  foregroundColor: string;
  backgroundColor: string;
};

export type ColoringRuleChain = {
  coloringRules: ColoringRule[];
};

export type MessageId = {
  messageId: Uint8Array;
};

export type ConsumerSessionEventMessagesProcessed = { type: 'messages-processed', messageCount: number };
export type ConsumerSessionEventMessagesDelivered = { type: 'messages-delivered', messageCount: number };
export type ConsumerSessionEventBytesProcessed = { type: 'bytes-processed', byteCount: number };
export type ConsumerSessionEventBytesDelivered = { type: 'bytes-delivered', byteCount: number };
export type ConsumerSessionEventMessageDecodeFailed = { type: 'decode-failed', failCount: number };
export type ConsumerSessionEventTimeElapsed = { type: 'time-elapsed', timeElapsedMs: number };
export type ConsumerSessionEventTopicEndReached = { type: 'topic-end-reached' };
export type ConsumerSessionEventUnexpectedErrorOccurred = { type: 'unexpected-error-occurred' };
export type ConsumerSessionEventMessageId = { type: 'message-id', messageId: MessageId };

export type ConsumerSessionEvent = ConsumerSessionEventMessagesProcessed |
  ConsumerSessionEventMessagesDelivered |
  ConsumerSessionEventBytesProcessed |
  ConsumerSessionEventBytesDelivered |
  ConsumerSessionEventMessageDecodeFailed |
  ConsumerSessionEventTimeElapsed |
  ConsumerSessionEventTopicEndReached |
  ConsumerSessionEventUnexpectedErrorOccurred |
  ConsumerSessionEventMessageId;

export type ConsumerSessionPauseTriggerChainMode = 'all' | 'any';

export type ConsumerSessionPauseTriggerChain = {
  events: ConsumerSessionEvent[];
  mode: ConsumerSessionPauseTriggerChainMode;
};

export type ConsumerSessionTopic = {
  topicSelector: ManagedTopicSelectorValOrRef;
  messageFilterChain: ManagedMessageFilterChainValOrRef;
  coloringRuleChain: ManagedColoringRuleChainValOrRef;
};

export type ConsumerSessionStartFrom =
  { type: "earliestMessage" } |
  { type: "latestMessage" } |
  { type: "nthMessageAfterEarliest", n: number } |
  { type: "nthMessageBeforeLatest", n: number } |
  { type: "messageId"; hexString: string } |
  { type: "dateTime"; dateTime: Date } |
  {
    type: "relativeDateTime",
    relativeDateTime: RelativeDateTime
  };

export type ConsumerSessionConfig = {
  startFrom: ConsumerSessionStartFrom;
  topics: ConsumerSessionTopic[];
  messageFilterChain: MessageFilterChain;
  pauseTriggerChain: ConsumerSessionPauseTriggerChain;
  coloringRuleChain: ColoringRuleChain;
};

type Nullable<T> = T | null;
export type MessageDescriptor = {
  messageId: Nullable<Uint8Array>;
  eventTime: Nullable<number>;
  publishTime: Nullable<number>;
  brokerPublishTime: Nullable<number>;
  sequenceId: Nullable<number>;
  producerName: Nullable<string>;
  key: Nullable<string>;
  orderingKey: Nullable<Uint8Array>;
  topic: Nullable<string>;
  size: Nullable<number>;
  redeliveryCount: Nullable<number>;
  schemaVersion: Nullable<number>;
  isReplicated: Nullable<boolean>;
  replicatedFrom: Nullable<string>;
  properties: Record<string, string>;

  rawValue: Nullable<Uint8Array>;
  value: Nullable<string>; // JSON string
  accum: Nullable<string>; // JSON string
  index: number; // Not a part of Pulsar message.
  debugStdout: Nullable<string>; // Not a part of Pulsar message.
};

export type PartialMessageDescriptor = Partial<MessageDescriptor>;

export type JsMessageFilter = {
  jsCode: string;
};

export type BasicMessageFilter = {

};

export type MessageFilter = {
  isEnabled: boolean;
  isNegated: boolean;
} & ({
  type: "js-message-filter";
  value: JsMessageFilter;
} | {
  type: "basic-message-filter";
  value: BasicMessageFilter;
});

export type MessageFilterChainMode = 'all' | 'any';

export type MessageFilterChain = {
  isEnabled: boolean;
  isNegated: boolean;
  filters: MessageFilter[];
  mode: MessageFilterChainMode;
}

export type MessageFilterType = MessageFilter['type'];
