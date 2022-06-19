import React, { useEffect } from 'react';
import useSWR, { SWRConfiguration } from 'swr';
import s from './NavigationTree.module.css'
import * as Notifications from '../app/contexts/Notifications';
import * as PulsarAdminClient from '../app/contexts/PulsarAdminClient';
import Link from '../ui/LinkWithQuery/LinkWithQuery';
import { swrKeys } from '../swrKeys';
import { routes } from '../routes';

const swrConfiguration: SWRConfiguration = { dedupingInterval: 10000 };

export type PulsarInstanceProps = {
  forceReloadKey: number;
  leftIndent: string;
  onDoubleClick: () => void;
  isActive: boolean;
}
export const PulsarInstance: React.FC<PulsarInstanceProps> = (props) => {
  return (
    <Link
      to={routes.instance._.get()}
      className={`${s.NodeLink} ${props.isActive ? s.NodeLinkActive : ''}`}
      style={{ paddingLeft: props.leftIndent }}
      onDoubleClick={props.onDoubleClick}
    >
      <span>Pulsar Instance</span>
    </Link>
  );
}

export type PulsarTenantProps = {
  forceReloadKey: number;
  tenant: string;
  onNamespaces: (namespaces: string[]) => void;
  leftIndent: string;
  onDoubleClick: () => void;
  isActive: boolean;
}
export const PulsarTenant: React.FC<PulsarTenantProps> = (props) => {
  const { notifyError } = Notifications.useContext();
  const adminClient = PulsarAdminClient.useContext().client;

  const { data: namespaces, error: namespacesError } = useSWR(
    swrKeys.pulsar.tenants.tenant.namespaces._({ tenant: props.tenant }),
    async () => (await adminClient.namespaces.getTenantNamespaces(props.tenant)).map(tn => tn.split('/')[1]),
    swrConfiguration
  );

  useEffect(() => props.onNamespaces(namespaces || []), [namespaces, props.forceReloadKey]);

  if (namespacesError) {
    notifyError(`Unable to fetch namespaces. ${namespacesError.toString()}`);
  }

  return (
    <Link
      to={routes.tenants.tenant._.get({ tenant: props.tenant })}
      className={`${s.NodeLink} ${props.isActive ? s.NodeLinkActive : ''}`}
      style={{ paddingLeft: props.leftIndent }}
      onDoubleClick={props.onDoubleClick}
    >
      <span>{props.tenant}</span>
    </Link>
  );
}

function getTopicName(tn: string): string {
  const topicUrlParts = tn.split('/');
  return topicUrlParts[topicUrlParts.length - 1];
};
type PulsarNamespaceProps = {
  forceReloadKey: number,
  tenant: string;
  namespace: string;
  onTopics: (topics: { persistent: string[], nonPersistent: string[] }) => void;
  leftIndent: string;
  onDoubleClick: () => void;
  isActive: boolean;
}
export const PulsarNamespace: React.FC<PulsarNamespaceProps> = (props) => {
  const { notifyError } = Notifications.useContext();
  const adminClient = PulsarAdminClient.useContext().client;

  const { data: topics, error: topicsError } = useSWR(
    swrKeys.pulsar.tenants.tenant.namespaces.namespace.topics._({ tenant: props.tenant, namespace: props.namespace }),
    async () => {
      const persistentTopics = (await adminClient.persistentTopic.getList(props.tenant, props.namespace, undefined, true)).map(getTopicName);
      const nonPersistentTopics = (await adminClient.nonPersistentTopic.getList(props.tenant, props.namespace, undefined, true)).map(getTopicName);
      return { persistent: persistentTopics, nonPersistent: nonPersistentTopics };
    },
    swrConfiguration
  );

  useEffect(() => props.onTopics(topics || { persistent: [], nonPersistent: [] }), [topics, props.forceReloadKey]);

  if (topicsError) {
    notifyError(`Unable to fetch namespace topics. ${topicsError.toString()}`);
  }

  return (
    <Link
      to={routes.tenants.tenant.namespaces.namespace._.get({ tenant: props.tenant, namespace: props.namespace })}
      className={`${s.NodeLink} ${props.isActive ? s.NodeLinkActive : ''}`}
      style={{ paddingLeft: props.leftIndent }}
      onDoubleClick={props.onDoubleClick}
    >
      <span>{props.namespace}</span>
    </Link>
  );
}

export type PulsarTopicProps = {
  tenant: string;
  namespace: string;
  topic: string;
  topicType: 'persistent' | 'non-persistent';
  leftIndent: string;
  onDoubleClick: () => void;
  isActive: boolean;
}
export const PulsarTopic: React.FC<PulsarTopicProps> = (props) => {
  return (
    <Link
      to={routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic._.get({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, topicType: props.topicType })}
      className={`${s.NodeLink} ${props.isActive ? s.NodeLinkActive : ''}`}
      style={{ paddingLeft: props.leftIndent }}
      onDoubleClick={props.onDoubleClick}
    >
      <span>{props.topic}</span>
    </Link>
  );
}
