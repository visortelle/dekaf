import { ConsumerSessionConfig } from "../../TopicPage/Messages/types";
import { MessageFilter, MessageFilterChain } from "../../TopicPage/Messages/SessionConfiguration/FilterChainEditor/types";

export type LibraryItemType =
  "consumer-session-config" | "message-filter" | "message-filter-chain";

export type LibraryItemDescriptor = {
  type: "consumer-session-config",
  value: ConsumerSessionConfig,
} | {
  type: "message-filter",
  value: MessageFilter,
} | {
  type: "message-filter-chain",
  value: MessageFilterChain,
};

export type LibraryItem = {
  id: string,
  revision: string,
  updatedAt: string,
  isEditable: boolean,
  name: string,
  descriptionMarkdown: string,
  tags: string[],
  descriptor: LibraryItemDescriptor,
}

export type ExactTenantMatcher = {
  type: 'exact-tenant-matcher',
  tenant: string;
};

export type RegexTenantMatcher = {
  type: 'regex-tenant-matcher',
  tenantRegex: string;
};

export type TenantMatcher = {
  type: 'tenant-matcher',
  value: ExactTenantMatcher | RegexTenantMatcher
};

export type TenantMatcherType = TenantMatcher['value']['type'];

export type ExactNamespaceMatcher = {
  type: 'exact-namespace-matcher',
  tenant: TenantMatcher;
  namespace: string;
};

export type RegexNamespaceMatcher = {
  type: 'regex-namespace-matcher',
  tenant: TenantMatcher;
  namespaceRegex: string;
};

export type NamespaceMatcher = {
  type: 'namespace-matcher',
  value: ExactNamespaceMatcher | RegexNamespaceMatcher
};
export type NamespaceMatcherType = NamespaceMatcher['value']['type'];

export type ExactTopicMatcher = {
  type: 'exact-topic-matcher',
  namespace: NamespaceMatcher;
  topic: string;
};

export type RegexTopicMatcher = {
  type: 'regex-topic-matcher',
  namespace: NamespaceMatcher;
  topicRegex: string;
};

export type TopicMatcher = {
  type: 'topic-matcher',
  value: ExactTopicMatcher | RegexTopicMatcher
};

export type TopicMatcherType = TopicMatcher['value']['type'];

export type ResourceMatcher = TopicMatcher | NamespaceMatcher | TenantMatcher;
