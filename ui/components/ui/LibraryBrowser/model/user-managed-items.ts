import { ConsumerSessionEventBytesDelivered, ConsumerSessionEventBytesProcessed, ConsumerSessionEventMessageDecodeFailed, ConsumerSessionEventMessagesDelivered, ConsumerSessionEventMessagesProcessed, ConsumerSessionEventTimeElapsed, ConsumerSessionEventTopicEndReached, ConsumerSessionEventUnexpectedErrorOccurred, ConsumerSessionPauseTriggerChainMode, DateTimeUnit, JsMessageFilter, MessageFilter, MessageFilterChainMode } from "../../ConsumerSession/types";
import { TopicSelector, MultiTopicSelector, NamespacedRegexTopicSelector } from "../../ConsumerSession/topic-selector/topic-selector";
import { BasicMessageFilter, BasicMessageFilterTarget } from "../../ConsumerSession/basic-message-filter-types";
import { Deserializer } from "../../ConsumerSession/deserializer/deserializer";
import { ConsumerSessionTargetConsumptionMode } from "../../ConsumerSession/consumption-mode/consumption-mode";

export type ValOrRef<ValueT> = {
  type: 'value',
  val: ValueT
} | {
  type: 'reference',
  ref: string,

  /* Value stored only in browser memory.
    Imagine a situation where you loaded two message filters with same id from library,
    and for one of them you made some changes without saving.
    */
  val?: ValueT
};

export type ManagedItemType =
  "consumer-session-config" |
  "consumer-session-target" |
  "producer-session-config" |
  "markdown-document" |
  "message-filter-chain" |
  "message-filter" |
  "message-id" |
  "date-time" |
  "coloring-rule" |
  "coloring-rule-chain" |
  "relative-date-time" |
  "consumer-session-start-from" |
  "consumer-session-event" |
  "consumer-session-pause-trigger-chain" |
  "topic-selector" |
  "basic-message-filter-target" |
  "value-projection" |
  "value-projection-list" |
  "deserializer";

export type ManagedItemMetadata = {
  type: ManagedItemType,
  id: string,
  name: string,
  descriptionMarkdown: string,
};

export type ManagedMessageFilterSpec = {
  isEnabled: boolean,
  isNegated: boolean,
  targetField: ManagedBasicMessageFilterTargetValOrRef,
  filter: BasicMessageFilter | JsMessageFilter
};

export type ManagedMessageFilter = {
  metadata: ManagedItemMetadata,
  spec: ManagedMessageFilterSpec,
};

export type ManagedMessageFilterValOrRef = ValOrRef<ManagedMessageFilter>;

export type ManagedMessageFilterChainSpec = {
  isEnabled: boolean,
  isNegated: boolean,
  filters: ManagedMessageFilterValOrRef[],
  mode: MessageFilterChainMode
};

export type ManagedMessageFilterChain = {
  metadata: ManagedItemMetadata,
  spec: ManagedMessageFilterChainSpec,
};

export type ManagedMessageFilterChainValOrRef = ValOrRef<ManagedMessageFilterChain>;

export type ManagedConsumerSessionTargetSelectorSpec = TopicSelector;

export type ManagedConsumerSessionTargetSelector = {
  metadata: ManagedItemMetadata,
  spec: ManagedConsumerSessionTargetSelectorSpec,
};

export type ManagedMessageIdSpec = {
  hexString: string
};
export type ManagedMessageId = {
  metadata: ManagedItemMetadata,
  spec: ManagedMessageIdSpec,
}
export type ManagedMessageIdValOrRef = ValOrRef<ManagedMessageId>;

export type ManagedDateTimeSpec = {
  dateTime: Date
};
export type ManagedDateTime = {
  metadata: ManagedItemMetadata,
  spec: ManagedDateTimeSpec,
}
export type ManagedDateTimeValOrRef = ValOrRef<ManagedDateTime>;

export type ManagedRelativeDateTimeSpec = {
  value: number,
  unit: DateTimeUnit,
  isRoundedToUnitStart: boolean,
};
export type ManagedRelativeDateTime = {
  metadata: ManagedItemMetadata,
  spec: ManagedRelativeDateTimeSpec,
}
export type ManagedRelativeDateTimeValOrRef = ValOrRef<ManagedRelativeDateTime>;

export type StartFromEarliestMessage = { type: 'earliestMessage' };
export type StartFromLatestMessage = { type: 'latestMessage' };
export type StartFromNthMessageAfterEarliest = { type: 'nthMessageAfterEarliest', n: number };
export type StartFromNthMessageBeforeLatest = { type: 'nthMessageBeforeLatest', n: number };
export type StartFromMessageId = { type: 'messageId', messageId: ManagedMessageIdValOrRef };
export type StartFromDateTime = { type: 'dateTime', dateTime: ManagedDateTimeValOrRef };
export type StartFromRelativeDateTime = { type: 'relativeDateTime', relativeDateTime: ManagedRelativeDateTimeValOrRef };

export type ManagedConsumerSessionStartFromSpec = {
  startFrom: StartFromEarliestMessage | StartFromLatestMessage | StartFromNthMessageAfterEarliest | StartFromNthMessageBeforeLatest | StartFromMessageId | StartFromDateTime | StartFromRelativeDateTime,
};
export type ManagedConsumerSessionStartFrom = {
  metadata: ManagedItemMetadata,
  spec: ManagedConsumerSessionStartFromSpec,
};
export type ManagedConsumerSessionStartFromValOrRef = ValOrRef<ManagedConsumerSessionStartFrom>;

export type CurrentTopicSelector = { type: "current-topic" };

export type ManagedTopicSelectorSpec = {
  topicSelector: CurrentTopicSelector | MultiTopicSelector | NamespacedRegexTopicSelector
};

export type ManagedTopicSelector = {
  metadata: ManagedItemMetadata,
  spec: ManagedTopicSelectorSpec,
};

export type ManagedTopicSelectorValOrRef = ValOrRef<ManagedTopicSelector>;

export type ManagedBasicMessageFilterTargetSpec = {
  target: BasicMessageFilterTarget
};

export type ManagedBasicMessageFilterTarget = {
  metadata: ManagedItemMetadata,
  spec: ManagedBasicMessageFilterTargetSpec,
};

export type ManagedBasicMessageFilterTargetValOrRef = ValOrRef<ManagedBasicMessageFilterTarget>;

export type ManagedValueProjectionSpec = {
  isEnabled: boolean,
  target: ManagedBasicMessageFilterTargetValOrRef,
  shortName: string,
  width: number | undefined
};

export type ManagedValueProjection = {
  metadata: ManagedItemMetadata,
  spec: ManagedValueProjectionSpec,
};

export type ManagedValueProjectionValOrRef = ValOrRef<ManagedValueProjection>;

export type ManagedValueProjectionListSpec = {
  isEnabled: boolean,
  projections: ManagedValueProjectionValOrRef[]
};

export type ManagedValueProjectionList = {
  metadata: ManagedItemMetadata,
  spec: ManagedValueProjectionListSpec,
};

export type ManagedValueProjectionListValOrRef = ValOrRef<ManagedValueProjectionList>;

export type ManagedColoringRuleSpec = {
  isEnabled: boolean,
  messageFilterChain: ManagedMessageFilterChainValOrRef,
  foregroundColor: string,
  backgroundColor: string,
};

export type ManagedColoringRule = {
  metadata: ManagedItemMetadata,
  spec: ManagedColoringRuleSpec,
};

export type ManagedColoringRuleValOrRef = ValOrRef<ManagedColoringRule>;

export type ManagedColoringRuleChainSpec = {
  isEnabled: boolean,
  coloringRules: ManagedColoringRuleValOrRef[],
};

export type ManagedColoringRuleChain = {
  metadata: ManagedItemMetadata,
  spec: ManagedColoringRuleChainSpec,
};

export type ManagedColoringRuleChainValOrRef = ValOrRef<ManagedColoringRuleChain>;

export type ManagedConsumerSessionEventSpec = {
  event:
  ConsumerSessionEventMessagesProcessed |
  ConsumerSessionEventMessagesDelivered |
  ConsumerSessionEventBytesProcessed |
  ConsumerSessionEventBytesDelivered |
  ConsumerSessionEventMessageDecodeFailed |
  ConsumerSessionEventTimeElapsed |
  ConsumerSessionEventTopicEndReached |
  ConsumerSessionEventUnexpectedErrorOccurred
};

export type ManagedConsumerSessionEvent = {
  metadata: ManagedItemMetadata,
  spec: ManagedConsumerSessionEventSpec,
};

export type ManagedConsumerSessionEventValOrRef = ValOrRef<ManagedConsumerSessionEvent>;

export type ManagedConsumerSessionPauseTriggerChainSpec = {
  events: ManagedConsumerSessionEventValOrRef[],
  mode: ConsumerSessionPauseTriggerChainMode
};

export type ManagedConsumerSessionPauseTriggerChain = {
  metadata: ManagedItemMetadata,
  spec: ManagedConsumerSessionPauseTriggerChainSpec,
};

export type ManagedConsumerSessionPauseTriggerChainValOrRef = ValOrRef<ManagedConsumerSessionPauseTriggerChain>;

export type ManagedConsumerSessionTargetSpec = {
  isEnabled: boolean,
  consumptionMode: ConsumerSessionTargetConsumptionMode,
  messageValueDeserializer: ManagedDeserializerValOrRef,
  topicSelector: ManagedTopicSelectorValOrRef,
  messageFilterChain: ManagedMessageFilterChainValOrRef,
  coloringRuleChain: ManagedColoringRuleChainValOrRef,
  valueProjectionList: ManagedValueProjectionListValOrRef
};

export type ManagedConsumerSessionTarget = {
  metadata: ManagedItemMetadata,
  spec: ManagedConsumerSessionTargetSpec,
};

export type ManagedConsumerSessionTargetValOrRef = ValOrRef<ManagedConsumerSessionTarget>;

export type ManagedConsumerSessionConfigSpec = {
  startFrom: ManagedConsumerSessionStartFromValOrRef,
  targets: ManagedConsumerSessionTargetValOrRef[],
  messageFilterChain: ManagedMessageFilterChainValOrRef,
  pauseTriggerChain: ManagedConsumerSessionPauseTriggerChainValOrRef,
  coloringRuleChain: ManagedColoringRuleChainValOrRef,
  valueProjectionList: ManagedValueProjectionListValOrRef
};

export type ManagedConsumerSessionConfig = {
  metadata: ManagedItemMetadata,
  spec: ManagedConsumerSessionConfigSpec,
};

export type ManagedConsumerSessionConfigValOrRef = ValOrRef<ManagedConsumerSessionConfig>;

export type ManagedMarkdownDocumentSpec = {
  markdown: string,
};

export type ManagedMarkdownDocument = {
  metadata: ManagedItemMetadata,
  spec: ManagedMarkdownDocumentSpec,
};

export type ManagedMarkdownDocumentValOrRef = ValOrRef<ManagedMarkdownDocument>;

export type ManagedDeserializerSpec = {
  deserializer: Deserializer,
};

export type ManagedDeserializer = {
  metadata: ManagedItemMetadata,
  spec: ManagedDeserializerSpec,
};

export type ManagedDeserializerValOrRef = ValOrRef<ManagedDeserializer>;

export type ManagedItem = ManagedMessageFilter |
  ManagedMessageFilterChain |
  ManagedConsumerSessionStartFrom |
  ManagedTopicSelector |
  ManagedConsumerSessionTarget |
  ManagedDateTime |
  ManagedRelativeDateTime |
  ManagedConsumerSessionEvent |
  ManagedConsumerSessionPauseTriggerChain |
  ManagedConsumerSessionConfig |
  ManagedTopicSelector |
  ManagedColoringRule |
  ManagedColoringRuleChain |
  ManagedConsumerSessionTarget |
  ManagedMessageId |
  ManagedMarkdownDocument |
  ManagedBasicMessageFilterTarget |
  ManagedValueProjection |
  ManagedValueProjectionList |
  ManagedDeserializer;
