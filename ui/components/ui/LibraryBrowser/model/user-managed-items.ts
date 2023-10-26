import { UserManagedMessageIdValueOrReference } from "../../../../grpc-web/tools/teal/pulsar/ui/library/v1/user_managed_items_pb";
import { ConsumerSessionTopicsSelector, MessageFilter, MessageFilterChainMode } from "../../../TopicPage/Messages/types";

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
  "consumer-session-config-start-from" |
  "consumer-session-config-pause-trigger" |
  "producer-session-config" |
  "message-filter" |
  "message-filter-chain";

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
  messageId: Uint8Array
};
export type UserManagedMessageId = {
  metadata: UserManagedItemMetadata,
  spec: UserManagedMessageIdSpec,
}
export type UserManagedMessageIdValueOrReference = ValueOrReference<UserManagedMessageId>;

export type UserManagedDateTimeSpec = {
  dateTime: string
};
export type UserManagedDateTime = {
  metadata: UserManagedItemMetadata,
  spec: UserManagedDateTimeSpec,
}
export type UserManagedDateTimeValueOrReference = ValueOrReference<UserManagedDateTime>;

export type DateTimeUnit =
  { type: 'year' } |
  { type: 'month' } |
  { type: 'week' } |
  { type: 'day' } |
  { type: 'hour' } |
  { type: 'minute' } |
  { type: 'second' };

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

export type StartFromEarliestMessage = { type: 'earliest-message' };
export type StartFromLatestMessage = { type: 'latest-message' };
export type StartFromMessageId = { type: 'message-id', messageId: UserManagedMessageIdValueOrReference };
export type StartFromDateTime = { type: 'date-time', dateTime: UserManagedDateTimeValueOrReference };
export type StartFromRelativeDateTime = { type: 'relative-date-time', relativeDateTime: UserManagedRelativeDateTimeValueOrReference };

export type UserManagedConsumerSessionConfigStartFromSpec = {
  startFrom: StartFromEarliestMessage | StartFromLatestMessage | StartFromMessageId | StartFromDateTime | StartFromRelativeDateTime,
};
export type UserManagedConsumerSessionConfigStartFrom = {
  metadata: UserManagedItemMetadata,
  spec: UserManagedConsumerSessionConfigStartFromSpec,
};
export type UserManagedConsumerSessionConfigStartFromValueOrReference = ValueOrReference<UserManagedConsumerSessionConfigStartFrom>;

export type UserManagedConsumerSessionTopicSelectorValueOrReference = ValueOrReference<UserManagedConsumerSessionTopicSelector>;

export type UserManagedConsumerSessionConfigSpec = {
  messageFilterChain: UserManagedMessageFilterChainValueOrReference,
  topicsSelector: ConsumerSessionTopicsSelector,
  startFrom: UserManagedConsumerSessionConfigStartFromValueOrReference,
};

export type UserManagedConsumerSessionConfig = {
  metadata: UserManagedItemMetadata,
  spec: UserManagedConsumerSessionConfigSpec,
};

export type UserManagedConsumerSessionConfigValueOrReference = ValueOrReference<UserManagedConsumerSessionConfig>;

export type UserManagedItem = UserManagedConsumerSessionConfig | UserManagedMessageFilter | UserManagedMessageFilterChain;
