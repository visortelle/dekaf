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
      to={routes.instance.tenants._.get()}
      className={`${s.NodeLink} ${props.isActive ? s.NodeLinkActive : ''}`}
      style={{ paddingLeft: props.leftIndent }}
      onDoubleClick={props.onDoubleClick}
    >
      <span className={s.NodeLinkText}>Pulsar Instance</span>
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
  isFetchData: boolean;
}
export const PulsarTenant: React.FC<PulsarTenantProps> = (props) => {
  const { notifyError } = Notifications.useContext();
  const adminClient = PulsarAdminClient.useContext().client;

  const { data: namespaces, error: namespacesError } = useSWR<string[]>(
    props.isFetchData ? swrKeys.pulsar.tenants.tenant.namespaces._({ tenant: props.tenant }) : null,
    async () => (await adminClient.namespaces.getTenantNamespaces(props.tenant)).map(tn => tn.split('/')[1]),
    swrConfiguration
  );

  useEffect(
    () => props.onNamespaces(namespaces ? namespaces.sort((a, b) => a.localeCompare(b, 'en', { numeric: true })) : []),
    [namespaces, props.forceReloadKey]
  );

  if (namespacesError) {
    notifyError(`Unable to fetch namespaces. ${namespacesError.toString()}`);
  }

  return (
    <Link
      to={routes.tenants.tenant.namespaces._.get({ tenant: props.tenant })}
      className={`${s.NodeLink} ${props.isActive ? s.NodeLinkActive : ''}`}
      style={{ paddingLeft: props.leftIndent }}
      onDoubleClick={props.onDoubleClick}
    >
      <span className={s.NodeLinkText}>{props.tenant}</span>
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
  isFetchData: boolean;
}
export const PulsarNamespace: React.FC<PulsarNamespaceProps> = (props) => {
  const { notifyError } = Notifications.useContext();
  const adminClient = PulsarAdminClient.useContext().client;

  const { data: persistentTopics, error: persistentTopicsError } = useSWR<string[]>(
    props.isFetchData ? swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics._({ tenant: props.tenant, namespace: props.namespace }) : null,
    async () => (await adminClient.persistentTopic.getList(props.tenant, props.namespace, undefined, true)).map(getTopicName),
    swrConfiguration
  );

  if (persistentTopicsError) {
    notifyError(`Unable to fetch persistent topics topics. ${persistentTopicsError.toString()}`);
  }

  const { data: nonPersistentTopics, error: nonPersistentTopicsError } = useSWR<string[]>(
    props.isFetchData ? swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics._({ tenant: props.tenant, namespace: props.namespace }) : null,
    async () => (await adminClient.nonPersistentTopic.getList(props.tenant, props.namespace, undefined, true)).map(getTopicName),
    swrConfiguration
  );

  if (nonPersistentTopicsError) {
    notifyError(`Unable to fetch non-persistent topics. ${persistentTopicsError.toString()}`);
  }

  useEffect(
    () => props.onTopics({
      persistent: (persistentTopics || []).sort((a, b) => a.localeCompare(b, 'en', { numeric: true })),
      nonPersistent: (nonPersistentTopics || []).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
    }),
    [persistentTopics, nonPersistentTopics, props.forceReloadKey]
  );

  return (
    <Link
      to={routes.tenants.tenant.namespaces.namespace.topics._.get({ tenant: props.tenant, namespace: props.namespace })}
      className={`${s.NodeLink} ${props.isActive ? s.NodeLinkActive : ''}`}
      style={{ paddingLeft: props.leftIndent }}
      onDoubleClick={props.onDoubleClick}
    >
      <span className={s.NodeLinkText}>{props.namespace}</span>
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
  isFetchData: boolean;
}
export const PulsarTopic: React.FC<PulsarTopicProps> = (props) => {
  return (
    <Link
      to={routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic._.get({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, topicType: props.topicType })}
      className={`${s.NodeLink} ${props.isActive ? s.NodeLinkActive : ''}`}
      style={{ paddingLeft: props.leftIndent }}
      onDoubleClick={props.onDoubleClick}
    >
      <span className={s.NodeLinkText}>{props.topic}</span>
    </Link>
  );
}
