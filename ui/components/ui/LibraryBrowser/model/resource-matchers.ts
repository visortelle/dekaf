type WithReactKey = { reactKey: string };

export type ExactTenantMatcher = WithReactKey & {
  type: 'exact-tenant-matcher',
  tenant: string;
};

export type RegexTenantMatcher = WithReactKey & {
  type: 'regex-tenant-matcher',
  tenantRegex: string;
};

export type TenantMatcher = WithReactKey & {
  type: 'tenant-matcher',
  value: ExactTenantMatcher | RegexTenantMatcher
};

export type TenantMatcherType = TenantMatcher['value']['type'];

export type ExactNamespaceMatcher = WithReactKey & {
  type: 'exact-namespace-matcher',
  tenant: TenantMatcher;
  namespace: string;
};

export type RegexNamespaceMatcher = WithReactKey & {
  type: 'regex-namespace-matcher',
  tenant: TenantMatcher;
  namespaceRegex: string;
};

export type NamespaceMatcher = WithReactKey & {
  type: 'namespace-matcher',
  value: ExactNamespaceMatcher | RegexNamespaceMatcher
};
export type NamespaceMatcherType = NamespaceMatcher['value']['type'];

export type TopicPersistency = 'persistent' | 'non-persistent' | 'any';

export type ExactTopicMatcher = WithReactKey & {
  type: 'exact-topic-matcher',
  persistency: TopicPersistency;
  namespace: NamespaceMatcher;
  topic: string;
};

export type RegexTopicMatcher = WithReactKey & {
  type: 'regex-topic-matcher',
  persistency: TopicPersistency;
  namespace: NamespaceMatcher;
  topicRegex: string;
};

export type TopicMatcher = WithReactKey & {
  type: 'topic-matcher',
  value: ExactTopicMatcher | RegexTopicMatcher
};

export type TopicMatcherType = TopicMatcher['value']['type'];

export type ResourceMatcher = WithReactKey & (TopicMatcher | NamespaceMatcher | TenantMatcher);
