import { TopicSelector, DateTimeUnit, MessageFilter, MessageFilterChainMode, NamespacedRegexTopicSelector } from "../../../TopicPage/Messages/types";

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
  "relative-date-time" |
  "consumer-session-start-from" |
  "consumer-session-pause-trigger" |
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

export type ManagedConsumerSessionTopicSelectorSpec = TopicSelector;

export type ManagedConsumerSessionTopicSelector = {
  metadata: ManagedItemMetadata,
  spec: ManagedConsumerSessionTopicSelectorSpec,
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

export type ManagedConsumerSessionTopicSelectorValOrRef = ValOrRef<ManagedConsumerSessionTopicSelector>;

export type TopicsSelectorCurrentTopic = { type: "current-topic" };

export type TopicsSelectorByFqns = {
  type: "by-fqns",
  topicFqns: string[],
  isConvertPartitionedTopicToItsPartitions: boolean,
};

export type ManagedTopicsSelectorSpec = {
  topicsSelector: TopicsSelectorCurrentTopic | TopicsSelectorByFqns | NamespacedRegexTopicSelector,
};

export type ManagedTopicsSelector = {
  metadata: ManagedItemMetadata,
  spec: ManagedTopicsSelectorSpec,
};

export type ManagedTopicsSelectorValOrRef = ValOrRef<ManagedTopicsSelector>;

export type ManagedConsumerSessionSpec = {
  messageFilterChain: ManagedMessageFilterChainValOrRef,
  topicsSelectors: ManagedTopicsSelectorValOrRef[],
  startFrom: ManagedConsumerSessionStartFromValOrRef,
};

export type ManagedConsumerSessionConfig = {
  metadata: ManagedItemMetadata,
  spec: ManagedConsumerSessionSpec,
};

export type ManagedConsumerSessionConfigValOrRef = ValOrRef<ManagedConsumerSessionConfig>;

export type ManagedItem = ManagedMessageFilter | ManagedMessageFilterChain | ManagedConsumerSessionStartFrom | ManagedTopicsSelector;
