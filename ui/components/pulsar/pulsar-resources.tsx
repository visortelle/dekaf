export type PulsarTopicPersistency = 'persistent' | 'non-persistent';
export type PulsarTopicPartitioning = 'partitioned' | 'non-partitioned';

export type PulsarInstanceResource = {
  type: 'instance'
};

export type PulsarTopicResource = {
  type: 'topic',
  tenant: string,
  namespace: string
  topicPersistency: PulsarTopicPersistency,
  topic: string
};

export type PulsarNamespaceResource = {
  type: 'namespace',
  tenant: string,
  namespace: string
}

export type PulsarTenantResource = {
  type: 'tenant',
  tenant: string
}

export type PulsarResource =
  PulsarInstanceResource |
  PulsarTenantResource |
  PulsarNamespaceResource |
  PulsarTopicResource;

/*
Resource FQN examples:
- tenant: tenant-a
- namespace: tenant-a/namespace-a
- topic: persistent://tenant-a/namespace-a/topic-a or non-persistent://tenant-a/namespace-a/topic-a
*/
export function pulsarResourceFromFqn<T extends PulsarResource>(fqn: string): T {
  const parts = fqn.split('/');
  if (parts.length === 1) {
    return { type: 'tenant', tenant: parts[0] } as T;
  } else if (parts.length === 2) {
    return { type: 'namespace', tenant: parts[0], namespace: parts[1] } as T;
  } else if (parts.length === 5) {
    return {
      type: 'topic',
      tenant: parts[2],
      namespace: parts[3],
      topicPersistency: parts[0].replace(/:$/, '') as PulsarTopicPersistency,
      topic: parts[4]
    } as T;
  }
  throw new Error(`Invalid Pulsar resource FQN: ${fqn}`);
}

export function pulsarResourceToFqn(resource: PulsarResource): string {
  switch (resource.type) {
    case 'instance':
      return '';
    case 'tenant':
      return resource.tenant;
    case 'namespace':
      return `${resource.tenant}/${resource.namespace}`;
    case 'topic':
      return `${resource.topicPersistency}://${resource.tenant}/${resource.namespace}/${resource.topic}`;
  }
}
