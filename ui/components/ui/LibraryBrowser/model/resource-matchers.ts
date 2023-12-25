type WithReactKey = { reactKey: string };

export type InstanceMatcher = WithReactKey & {
  type: "instance-matcher"
}

export type ExactTenantMatcher = WithReactKey & {
  type: 'exact-tenant-matcher',
  tenant: string;
};

export type AllTenantMatcher = WithReactKey & {
  type: 'all-tenant-matcher'
};

export type TenantMatcher = WithReactKey & {
  type: 'tenant-matcher',
  value: ExactTenantMatcher | AllTenantMatcher
};

export type TenantMatcherType = TenantMatcher['value']['type'];

export type ExactNamespaceMatcher = WithReactKey & {
  type: 'exact-namespace-matcher',
  tenant: TenantMatcher;
  namespace: string;
};

export type AllNamespaceMatcher = WithReactKey & {
  type: 'all-namespace-matcher',
  tenant: TenantMatcher
};

export type NamespaceMatcher = WithReactKey & {
  type: 'namespace-matcher',
  value: ExactNamespaceMatcher | AllNamespaceMatcher
};
export type NamespaceMatcherType = NamespaceMatcher['value']['type'];

export type ExactTopicMatcher = WithReactKey & {
  type: 'exact-topic-matcher',
  namespace: NamespaceMatcher;
  topic: string;
};

export type AllTopicMatcher = WithReactKey & {
  type: 'all-topic-matcher',
  namespace: NamespaceMatcher
};

export type TopicMatcher = WithReactKey & {
  type: 'topic-matcher',
  value: ExactTopicMatcher | AllTopicMatcher
};

export type TopicMatcherType = TopicMatcher['value']['type'];

export type ResourceMatcher = WithReactKey & (InstanceMatcher | TopicMatcher | NamespaceMatcher | TenantMatcher);
