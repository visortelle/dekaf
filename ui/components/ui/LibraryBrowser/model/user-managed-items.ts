import { MessageFilter, MessageFilterChainMode } from "../../../TopicPage/Messages/types";

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
  localValue?: ValueT
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

export type UserManagedConsumerSessionConfigSpec = {
  messageFilterChain: UserManagedMessageFilterChainValueOrReference
};

export type UserManagedConsumerSessionConfig = {
  metadata: UserManagedItemMetadata,
  spec: UserManagedConsumerSessionConfigSpec,
};

export type UserManagedConsumerSessionConfigValueOrReference = ValueOrReference<UserManagedConsumerSessionConfig>;

export type UserManagedItem = UserManagedConsumerSessionConfig | UserManagedMessageFilter | UserManagedMessageFilterChain;
