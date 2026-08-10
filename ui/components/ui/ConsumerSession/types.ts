import { ValueProjectionList } from "./value-projections/value-projections";
import { BasicMessageFilter, BasicMessageFilterTarget } from "./basic-message-filter-types";
import { TopicSelector } from "./topic-selector/topic-selector";
import { ConsumerSessionTargetConsumptionMode } from "./consumption-mode/consumption-mode";
import { Deserializer } from "./deserializer/deserializer";

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
  isEnabled: boolean,
  consumptionMode: ConsumerSessionTargetConsumptionMode,
  messageValueDeserializer: Deserializer,
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
  // Approximate data position: proportional to retained entries, per physical topic. One entry can
  // hold a batch, so this is deliberately not presented as an exact message percentile.
  { type: "approximateEntryPosition", fraction: number } |
  // Approximate publish-time position: interpolated between observed first- and final-entry publish
  // times, per logical topic. All partitions of the topic use the same cutoff.
  { type: "approximatePublishTimePosition", fraction: number } |
  { type: "messageId"; hexString: string } |
  { type: "dateTime"; dateTime: Date } |
  {
    type: "relativeDateTime",
    relativeDateTime: RelativeDateTime
  };

/** How a session reading more than one topic or partition interleaves messages. Guaranteed waits
 * for every source without a timeout; Best effort uses a ~0.75 s reorder window; Fastest does not
 * reorder across sources. A single source needs no ordering layer. A missing value means
 * Guaranteed.
 *
 * `'best-effort'` is deliberately NOT named after a timestamp: which timestamp the merge compares
 * is a separate choice, `DeliveryOrderKey`. The wire constant it maps to still reads
 * `MESSAGE_DELIVERY_ORDER_BEST_EFFORT_BY_PUBLISH_TIME` because it predates that choice, and its
 * name and value 2 are frozen for compatibility - the mapping lives in
 * `conversions/conversions.ts` and `LibraryBrowser/model/user-managed-items-conversions-pb.ts`.
 * These three strings are also the `<option value>`s of the Delivery order select, so the e2e and
 * jest assertions on `cs-delivery-order` move with them. */
export type MessageDeliveryOrder = 'as-received' | 'best-effort' | 'guaranteed';

/** Which Pulsar timestamp the delivery order compares (not the message `orderingKey`). Broker
 * publish time requires broker entry metadata. Event time is optional and application-set.
 * Missing broker/event timestamps use publish time and are counted. */
export type DeliveryOrderKey = 'publish-time' | 'broker-publish-time' | 'event-time';

/**
 * The guaranteed replay's caught-up announcement, as one record: the boundary the replay delivered
 * up to, the approximate newer-data indicator, and the topics excluded from this replay chunk.
 *
 * `newerEntriesApprox` counts broker ENTRIES, not messages - under batching one entry holds many
 * messages, so it is a lower bound and every rendering of it must say "~" or "new messages
 * waiting", never an exact count. `excludedTopics` is capped at 5 names by the server;
 * `excludedTopicCount` carries the true count.
 */
export type ReplayCaughtUpStats = {
  boundaryAtMs: number;
  newerEntriesApprox: number;
  excludedTopics: string[];
  excludedTopicCount: number;
};

export type ConsumerSessionConfig = {
  startFrom: ConsumerSessionStartFrom;
  targets: ConsumerSessionTarget[];
  messageFilterChain: MessageFilterChain;
  pauseTriggerChain: ConsumerSessionPauseTriggerChain;
  coloringRuleChain: ColoringRuleChain;
  valueProjectionList: ValueProjectionList;
  numDisplayItems: number;
  // Runtime configs are normalized at the saved-item boundary, so this is always explicit.
  messageDeliveryOrder: MessageDeliveryOrder;
  deliveryOrderKey?: DeliveryOrderKey;
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
  properties: Nullable<Record<string, string>>;

  // Fields below aren't a part of Pulsar message.
  rawValue: Nullable<Uint8Array>;
  value: Nullable<string>; // JSON string
  sessionContextStateJson: Nullable<string>; // JSON string
  displayIndex: Nullable<number>;
  numMessageProcessed: Nullable<number>;
  numMessageSent: Nullable<number>;
  debugStdout: Nullable<string>;
  /** The guaranteed replay delivered this message out of the selected-time order across a pause
   * seam (a producer clock wrote an earlier timestamp into the pause window). Detected at
   * emission by the server, flagged loudly, never dropped. Absent on the wire means false. */
  replaySeamViolation: boolean;

  sessionTargetIndex: Nullable<number>,

  sessionColorRuleChainTestResults: Nullable<ChainTestResult[]>,
  sessionTargetColorRuleChainTestResults: Nullable<ChainTestResult[]>,

  sessionMessageFilterChainTestResult: Nullable<ChainTestResult>,
  sessionTargetMessageFilterChainTestResult: Nullable<ChainTestResult>

  sessionValueProjectionListResult: Nullable<ValueProjectionResult[]>,
  sessionTargetValueProjectionListResult: Nullable<ValueProjectionResult[]>,
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
