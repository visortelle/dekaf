export type TopicType = 'persistent' | 'non-persistent';

export type TenantNode = {
  tenant: string;
}

export type NamespaceNode = {
  tenant: string;
  namespace: string;
}

export type TopicNode = {
  tenant: string;
  namespace: string;
  topicName: string;
  topicType: TopicType;
}
