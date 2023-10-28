import { ConsumerSessionTopicsSelector, DateTimeUnit, MessageFilter, MessageFilterChainMode } from "../../../TopicPage/Messages/types";

export type ValueOrReference<ValueT> = {
  type: 'value',
  value: ValueT
} | {
  type: 'reference',
  reference: string,

  /* Value stored only in browser memory.
    Imagine a situation where you loaded two message filters with same id from library,
    and for one of them you made some changes without saving.
    */
  value?: ValueT
};

export type UserManagedItemType =
  "consumer-session-config" |
  "consumer-session-pause-trigger" |
  "consumer-session-start-from" |
  "date-time" |
  "message-filter-chain" |
  "message-filter" |
  "message-id" |
  "producer-session-config" |
  "relative-date-time";

export type UserManagedItemMetadata = {
  type: UserManagedItemType,
  id: string,
  name: string,
  descriptionMarkdown: string,
};

export type UserManagedMessageFilterSpec = MessageFilter;

export type UserManagedMessageFilter = {
  metadata: UserManagedItemMetadata,
  spec: UserManagedMessageFilterSpec,
};

export type UserManagedMessageFilterValueOrReference = ValueOrReference<UserManagedMessageFilter>;

export type UserManagedMessageFilterChainSpec = {
  isEnabled: boolean,
  isNegated: boolean,
  filters: UserManagedMessageFilterValueOrReference[],
  mode: MessageFilterChainMode
};

export type UserManagedMessageFilterChain = {
  metadata: UserManagedItemMetadata,
  spec: UserManagedMessageFilterChainSpec,
};

export type UserManagedMessageFilterChainValueOrReference = ValueOrReference<UserManagedMessageFilterChain>;

export type UserManagedConsumerSessionTopicSelectorSpec = ConsumerSessionTopicsSelector;

export type UserManagedConsumerSessionTopicSelector = {
  metadata: UserManagedItemMetadata,
  spec: UserManagedConsumerSessionTopicSelectorSpec,
};

export type UserManagedMessageIdSpec = {
  hexString: string
};
export type UserManagedMessageId = {
  metadata: UserManagedItemMetadata,
  spec: UserManagedMessageIdSpec,
}
export type UserManagedMessageIdValueOrReference = ValueOrReference<UserManagedMessageId>;

export type UserManagedDateTimeSpec = {
  dateTime: Date
};
export type UserManagedDateTime = {
  metadata: UserManagedItemMetadata,
  spec: UserManagedDateTimeSpec,
}
export type UserManagedDateTimeValueOrReference = ValueOrReference<UserManagedDateTime>;

export type UserManagedRelativeDateTimeSpec = {
  value: number,
  unit: DateTimeUnit,
  isRoundedToUnitStart: boolean,
};
export type UserManagedRelativeDateTime = {
  metadata: UserManagedItemMetadata,
  spec: UserManagedRelativeDateTimeSpec,
}
export type UserManagedRelativeDateTimeValueOrReference = ValueOrReference<UserManagedRelativeDateTime>;

export type StartFromEarliestMessage = { type: 'earliestMessage' };
export type StartFromLatestMessage = { type: 'latestMessage' };
export type StartFromMessageId = { type: 'messageId', messageId: UserManagedMessageIdValueOrReference };
export type StartFromDateTime = { type: 'dateTime', dateTime: UserManagedDateTimeValueOrReference };
export type StartFromRelativeDateTime = { type: 'relativeDateTime', relativeDateTime: UserManagedRelativeDateTimeValueOrReference };

export type UserManagedConsumerSessionStartFromSpec = {
  startFrom: StartFromEarliestMessage | StartFromLatestMessage | StartFromMessageId | StartFromDateTime | StartFromRelativeDateTime,
};
export type UserManagedConsumerSessionStartFrom = {
  metadata: UserManagedItemMetadata,
  spec: UserManagedConsumerSessionStartFromSpec,
};
export type UserManagedConsumerSessionStartFromValueOrReference = ValueOrReference<UserManagedConsumerSessionStartFrom>;

export type UserManagedConsumerSessionTopicSelectorValueOrReference = ValueOrReference<UserManagedConsumerSessionTopicSelector>;

export type UserManagedConsumerSessionSpec = {
  messageFilterChain: UserManagedMessageFilterChainValueOrReference,
  topicsSelector: ConsumerSessionTopicsSelector,
  startFrom: UserManagedConsumerSessionStartFromValueOrReference,
};

export type UserManagedConsumerSessionConfig = {
  metadata: UserManagedItemMetadata,
  spec: UserManagedConsumerSessionSpec,
};

export type UserManagedConsumerSessionConfigValueOrReference = ValueOrReference<UserManagedConsumerSessionConfig>;

export type UserManagedItem = UserManagedMessageFilter | UserManagedMessageFilterChain | UserManagedConsumerSessionStartFrom;
