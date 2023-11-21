import { ConsumerSessionEventBytesDelivered, ConsumerSessionEventBytesProcessed, ConsumerSessionEventMessageDecodeFailed, ConsumerSessionEventMessagesDelivered, ConsumerSessionEventMessagesProcessed, ConsumerSessionEventTimeElapsed, ConsumerSessionEventTopicEndReached, ConsumerSessionEventUnexpectedErrorOccurred, ConsumerSessionPauseTriggerChainMode, DateTimeUnit, MessageFilter, MessageFilterChainMode } from "../../../TopicPage/Messages/types";
import { TopicSelector, MultiTopicSelector, NamespacedRegexTopicSelector } from "../../../TopicPage/Messages/topic-selector/topic-selector";

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
  "consumer-session-topic" |
  "topic-selector";

export type ManagedItemMetadata = {
  type: ManagedItemType,
  id: string,
  name: string,
  descriptionMarkdown: string,
};

export type ManagedMessageFilterSpec = MessageFilter;

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
  topicSelector: ManagedTopicSelectorValOrRef,
  messageFilterChain: ManagedMessageFilterChainValOrRef,
  coloringRuleChain: ManagedColoringRuleChainValOrRef,
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
};

export type ManagedConsumerSessionConfig = {
  metadata: ManagedItemMetadata,
  spec: ManagedConsumerSessionConfigSpec,
};

export type ManagedConsumerSessionConfigValOrRef = ValOrRef<ManagedConsumerSessionConfig>;

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
  ManagedMessageId;
