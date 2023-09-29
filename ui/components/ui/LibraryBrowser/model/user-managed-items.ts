import { MessageFilter, MessageFilterChainMode } from "../../../TopicPage/Messages/types";

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

export type UserManagedMessageFilterSpec = {
  messageFilter: MessageFilter
};

export type UserManagedMessageFilter = {
  metadata: UserManagedItemMetadata,
  spec: UserManagedMessageFilterSpec,
};

export type UserManagedMessageFilterValueOrReference = {
  type: 'value',
  value: UserManagedMessageFilter
} | {
  type: 'reference',
  reference: string
};

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

export type UserManagedMessageFilterChainValueOrReference = {
  type: 'value',
  value: UserManagedMessageFilterChain
} | {
  type: 'reference',
  reference: string
};

export type UserManagedItem = UserManagedMessageFilter | UserManagedMessageFilterChain;
