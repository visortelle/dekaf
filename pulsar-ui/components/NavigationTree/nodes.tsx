import React, { useEffect } from 'react';
import useSWR from 'swr';
import s from './NavigationTree.module.css'
import * as Notifications from '../contexts/Notifications';
import * as PulsarAdminClient from '../contexts/PulsarAdminClient';
import { NavLink } from "react-router-dom";
import { swrKeys } from '../swrKeys';

export type PulsarTenantProps = {
  forceReloadKey: number;
  tenant: string;
  onNamespaces: (namespaces: string[]) => void;
  leftIndent: string;
  onDoubleClick: () => void;
}
export const PulsarTenant: React.FC<PulsarTenantProps> = (props) => {
  const { notifyError } = Notifications.useContext();
  const adminClient = PulsarAdminClient.useContext().client;

  const { data: namespaces, error: namespacesError } = useSWR(
    swrKeys.pulsar.tenants.namespaces._({ tenant: props.tenant }),
    async () => (await adminClient.namespaces.getTenantNamespaces(props.tenant)).map(tn => tn.split('/')[1]),
  );

  useEffect(() => props.onNamespaces(namespaces || []), [namespaces, props.forceReloadKey]);

  if (namespacesError) {
    notifyError(`Unable to fetch namespaces. ${namespacesError.toString()}`);
  }

  return (
    <NavLink
      to={`/tenants/${props.tenant}`}
      end
      className={({ isActive }) => `${s.NodeLink} ${isActive ? s.NodeLinkActive : ''}`}
      style={{ paddingLeft: props.leftIndent }}
      onDoubleClick={props.onDoubleClick}
    >
      <span>{props.tenant}</span>
    </NavLink>
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
}
export const PulsarNamespace: React.FC<PulsarNamespaceProps> = (props) => {
  const { notifyError } = Notifications.useContext();
  const adminClient = PulsarAdminClient.useContext().client;

  const { data: topics, error: topicsError } = useSWR(
    swrKeys.pulsar.tenants.namespaces.topics._({ tenant: props.tenant, namespace: props.namespace }),
    async () => {
      const persistentTopics = (await adminClient.persistentTopic.getList(props.tenant, props.namespace, undefined, true)).map(getTopicName);
      const nonPersistentTopics = (await adminClient.nonPersistentTopic.getList(props.tenant, props.namespace, undefined, true)).map(getTopicName);
      return { persistent: persistentTopics, nonPersistent: nonPersistentTopics };
    }
  );

  useEffect(() => props.onTopics(topics || { persistent: [], nonPersistent: [] }), [topics, props.forceReloadKey]);

  if (topicsError) {
    notifyError(`Unable to fetch namespace topics. ${topicsError.toString()}`);
  }

  return (
    <NavLink
      to={`/tenants/${props.tenant}/namespaces/${props.namespace}`}
      end
      className={({ isActive }) => `${s.NodeLink} ${isActive ? s.NodeLinkActive : ''}`}
      style={{ paddingLeft: props.leftIndent }}
      onDoubleClick={props.onDoubleClick}
    >
      <span>{props.namespace}</span>
    </NavLink>
  );
}

export type PulsarTopicProps = {
  tenant: string;
  namespace: string;
  topic: string;
  topicType: 'persistent' | 'non-persistent';
  leftIndent: string;
  onDoubleClick: () => void;
}
export const PulsarTopic: React.FC<PulsarTopicProps> = (props) => {
  return (
    <NavLink
      to={`/tenants/${props.tenant}/namespaces/${props.namespace}/topics/${props.topicType}/${props.topic}`}
      end
      className={({ isActive }) => `${s.NodeLink} ${isActive ? s.NodeLinkActive : ''}`}
      style={{ paddingLeft: props.leftIndent }}
      onDoubleClick={props.onDoubleClick}
    >
      <span>{props.topic}</span>
    </NavLink>
  );
}
