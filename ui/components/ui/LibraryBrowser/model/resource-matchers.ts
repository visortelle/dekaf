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

export type TopicPersistency = 'persistent' | 'non-persistent' | 'any';

export type ExactTopicMatcher = {
  type: 'exact-topic-matcher',
  persistency: TopicPersistency;
  namespace: NamespaceMatcher;
  topic: string;
};

export type RegexTopicMatcher = {
  type: 'regex-topic-matcher',
  persistency: TopicPersistency;
  namespace: NamespaceMatcher;
  topicRegex: string;
};

export type TopicMatcher = {
  type: 'topic-matcher',
  value: ExactTopicMatcher | RegexTopicMatcher
};

export type TopicMatcherType = TopicMatcher['value']['type'];

export type ResourceMatcher = TopicMatcher | NamespaceMatcher | TenantMatcher;
