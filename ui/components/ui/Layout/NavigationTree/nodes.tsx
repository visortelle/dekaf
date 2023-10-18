import React, { useEffect, useMemo } from 'react';
import useSWR, { SWRConfiguration } from 'swr';
import s from './NavigationTree.module.css'
import * as AppContext from '../../../app/contexts/AppContext';
import * as Notifications from '../../../app/contexts/Notifications';
import * as GrpcClient from '../../../app/contexts/GrpcClient/GrpcClient';
import * as namespacePb from '../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb';
import * as topicsPb from '../../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb';
import Link from '../../Link/Link';
import { swrKeys } from '../../../swrKeys';
import { routes } from '../../../routes';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';

const swrConfiguration: SWRConfiguration = { dedupingInterval: 10000 };

export type PulsarInstanceProps = {
  forceReloadKey: number;
  leftIndent: string;
  onDoubleClick: () => void;
  isActive: boolean;
}
export const PulsarInstance: React.FC<PulsarInstanceProps> = (props) => {
  const { config } = AppContext.useContext();

  return (
    <Link
      to={routes.instance.overview._.get()}
      className={`${s.NodeLink} ${props.isActive ? s.NodeLinkActive : ''}`}
      style={{ paddingLeft: props.leftIndent }}
      onDoubleClick={props.onDoubleClick}
    >
      <span className={s.NodeLinkText}>{config.pulsarName || 'Pulsar Instance'}</span>
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
  const { namespaceServiceClient } = GrpcClient.useContext();

  const { data: namespaces, error: namespacesError } = useSWR<string[]>(
    props.isFetchData ? swrKeys.pulsar.tenants.tenant.namespaces._({ tenant: props.tenant }) : null,
    async () => {
      const req = new namespacePb.ListNamespacesRequest();
      req.setTenant(props.tenant);

      const res = await namespaceServiceClient.listNamespaces(req, null);
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(res.getStatus()?.getMessage());
        return [];
      }

      return res.getNamespacesList().map(ns => ns.split('/')[1]);
    },
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
function squashPartitionedTopics(topics: string[]): string[] {
  return Array.from(
    new Set(topics.map((topic: string) => topic.replace(/-partition-\d+$/, "")))
  );
}
export const PulsarNamespace: React.FC<PulsarNamespaceProps> = (props) => {
  const { notifyError } = Notifications.useContext();
  const { topicServiceClient } = GrpcClient.useContext();

  const { data: _persistentTopics, error: persistentTopicsError } = useSWR<string[]>(
    props.isFetchData ? swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics._({ tenant: props.tenant, namespace: props.namespace }) : null,
    async () => {
      const req = new topicsPb.ListTopicsRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);
      req.setTopicDomain(topicsPb.TopicDomain.TOPIC_DOMAIN_PERSISTENT);

      const res = await topicServiceClient.listTopics(req, null);
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to fetch persistent topics. ${res.getStatus()?.getMessage()}`);
        return [];
      }

      return res.getTopicsList();
    },
    swrConfiguration
  );
  const persistentTopics = useMemo(() => (_persistentTopics || []).map(tn => getTopicName(tn)), [_persistentTopics]);

  if (persistentTopicsError) {
    notifyError(`Unable to fetch persistent topics topics. ${persistentTopicsError.toString()}`);
  }

  const { data: _nonPersistentTopics, error: nonPersistentTopicsError } = useSWR<string[]>(
    props.isFetchData ? swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics._({ tenant: props.tenant, namespace: props.namespace }) : null,
    async () => {
      const req = new topicsPb.ListTopicsRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);
      req.setTopicDomain(topicsPb.TopicDomain.TOPIC_DOMAIN_NON_PERSISTENT);

      const res = await topicServiceClient.listTopics(req, null);
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to fetch non-persistent topics. ${res.getStatus()?.getMessage()}`);
      }

      return res.getTopicsList();
    },
    swrConfiguration
  );
  const nonPersistentTopics = useMemo(() => (_nonPersistentTopics || []).map(tn => getTopicName(tn)), [_nonPersistentTopics]);

  if (nonPersistentTopicsError) {
    notifyError(`Unable to fetch non-persistent topics. ${persistentTopicsError.toString()}`);
  }

  useEffect(
    () => props.onTopics({
      persistent: squashPartitionedTopics((persistentTopics || [])).sort((a, b) => a.localeCompare(b, 'en', { numeric: true })),
      nonPersistent: squashPartitionedTopics((nonPersistentTopics || [])).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
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
  topicPersistency: 'persistent' | 'non-persistent';
  leftIndent: string;
  onDoubleClick: () => void;
  isActive: boolean;
  isFetchData: boolean;
}
export const PulsarTopic: React.FC<PulsarTopicProps> = (props) => {
  const topicName = getTopicName(props.topic);

  return (
    <Link
      to={routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.messages._.get({ tenant: props.tenant, namespace: props.namespace, topic: topicName, topicPersistency: props.topicPersistency })}
      className={`${s.NodeLink} ${props.isActive ? s.NodeLinkActive : ''}`}
      style={{ paddingLeft: props.leftIndent }}
      onDoubleClick={props.onDoubleClick}
    >
      <span className={s.NodeLinkText}>{topicName}</span>
    </Link>
  );
}
