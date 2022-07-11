export function parseTopic(fullyQualifiedTopic: string): { tenant: string, namespace: string, topic: string, topicType: 'persistent' | 'non-persistent'} {
  const [topicType, rest] = fullyQualifiedTopic.split('://');
  const [tenant, namespace, topic] = rest.split('/');
  return { tenant, namespace, topic, topicType: topicType as 'persistent' | 'non-persistent' };
}
