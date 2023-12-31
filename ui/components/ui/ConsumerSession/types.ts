import { ValueProjectionList } from "./SessionConfiguration/ValueProjectionListInput/value-projections";
import { BasicMessageFilter, BasicMessageFilterTarget } from "./basic-message-filter-types";
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
  isEnabled: boolean;
  messageFilterChain: MessageFilterChain;
  foregroundColor: string;
  backgroundColor: string;
};

export type ColoringRuleChain = {
  isEnabled: boolean;
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

export type ConsumerSessionTarget = {
  topicSelector: TopicSelector;
  messageFilterChain: MessageFilterChain;
  coloringRuleChain: ColoringRuleChain;
  valueProjectionList: ValueProjectionList;
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
  targets: ConsumerSessionTarget[];
  messageFilterChain: MessageFilterChain;
  pauseTriggerChain: ConsumerSessionPauseTriggerChain;
  coloringRuleChain: ColoringRuleChain;
  valueProjectionList: ValueProjectionList;
};

export type ValueProjectionResult = {
  displayValue: string | undefined
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

  // Fields below aren't a part of Pulsar message.
  rawValue: Nullable<Uint8Array>;
  value: Nullable<string>; // JSON string
  sessionContextStateJson: Nullable<string>; // JSON string
  index: number;
  debugStdout: Nullable<string>;

  sessionTargetIndex: Nullable<number>,

  sessionColorRuleChainTestResults: ChainTestResult[],
  sessionTargetColorRuleChainTestResults: ChainTestResult[],

  sessionMessageFilterChainTestResult: ChainTestResult | undefined,
  sessionTargetMessageFilterChainTestResult: ChainTestResult | undefined

  sessionValueProjectionListResult: ValueProjectionResult[],
  sessionTargetValueProjectionListResult: ValueProjectionResult[],
};

export type PartialMessageDescriptor = Partial<MessageDescriptor>;

export type JsMessageFilter = {
  type: "JsMessageFilter",
  jsCode: string;
};

export type MessageFilter = {
  type: "MessageFilter";
  isEnabled: boolean;
  isNegated: boolean;
  targetField: BasicMessageFilterTarget
  filter: JsMessageFilter | BasicMessageFilter
};

export type MessageFilterChainMode = 'all' | 'any';

export type MessageFilterChain = {
  isEnabled: boolean;
  isNegated: boolean;
  filters: MessageFilter[];
  mode: MessageFilterChainMode;
}

export type MessageFilterType = MessageFilter['filter']['type'];

export type TestResult = {
  isOk: boolean,
  error: string | undefined
};

export type ChainTestResult = {
  isOk: boolean,
  results: TestResult[]
};
