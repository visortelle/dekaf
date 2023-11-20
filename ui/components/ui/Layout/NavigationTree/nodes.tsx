import React, { useEffect } from 'react';
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
import SmallButton from '../../SmallButton/SmallButton';
import copyIcon from './copy.svg';
import { TopicTreeNode, TreeNode } from './TreeView';
import { partition } from 'lodash';
import { customTopicsNamesSort } from '../../../NamespacePage/Topics/sorting';

const swrConfiguration: SWRConfiguration = { dedupingInterval: 10000 };

const parseTopicFqn = (topicFqn: string): { persistency: 'persistent' | 'non-persistent', tenant: string, namespace: string, topic: string } => {
  const [persistency, rest] = topicFqn.split("://");
  const [tenant, namespace, topic] = rest.split("/");
  return {
    persistency: persistency as 'persistent' | 'non-persistent',
    tenant,
    namespace,
    topic
  }
}

const partitionRegexp = /.*-partition-\d+$/;
const topicTreeNodeFromFqn = (topicFqn: string, isPartitioned: boolean): TopicTreeNode => {
  const { persistency, tenant, namespace, topic } = parseTopicFqn(topicFqn);
  const isPartition = isPartitioned ? false : partitionRegexp.test(topicFqn);

  let partitioning: TopicTreeNode['partitioning'] = isPartitioned ? { type: "partitioned" } : { type: "non-partitioned" };
  if (isPartition) {
    partitioning = { type: "partition" };
  }

  return {
    type: 'topic',
    partitioning,
    persistency,
    tenant,
    namespace,
    topic,
    topicFqn
  }
};

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
  const { notifyError, notifySuccess } = Notifications.useContext();
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

  const resourceFqn = props.tenant;

  return (
    <Link
      to={routes.tenants.tenant.overview._.get({ tenant: props.tenant })}
      className={`${s.NodeLink} ${props.isActive ? s.NodeLinkActive : ''}`}
      style={{ paddingLeft: props.leftIndent }}
      onDoubleClick={props.onDoubleClick}
    >
      <span className={s.NodeLinkText}>{props.tenant}</span>

      <div className={s.CopyResourceFqnButton}>
        <SmallButton
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            navigator.clipboard.writeText(resourceFqn);
            notifySuccess(<div>Fully qualified resource name copied to clipboard: {resourceFqn}</div>, Date.now().toString());
          }}
          svgIcon={copyIcon}
          type={"regular"}
          title={`Copy resource FQN: ${resourceFqn}`}
          appearance="borderless-semitransparent"
        />
      </div>
    </Link>
  );
}

type PulsarNamespaceProps = {
  forceReloadKey: number,
  tenant: string;
  namespace: string;
  onTopics: (topics: { persistent: TopicTreeNode[], nonPersistent: TopicTreeNode[] }) => void;
  leftIndent: string;
  onDoubleClick: () => void;
  isActive: boolean;
  isFetchData: boolean;
}

export const PulsarNamespace: React.FC<PulsarNamespaceProps> = (props) => {
  const { notifyError, notifySuccess } = Notifications.useContext();
  const { topicServiceClient } = GrpcClient.useContext();

  const { data: nonPartitionedTopicFqns, error: nonPartitionedTopicFqnsError } = useSWR<string[]>(
    props.isFetchData ? swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPartitionedTopics._({ tenant: props.tenant, namespace: props.namespace }) : null,
    async () => {
      const req = new topicsPb.ListTopicsRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);

      const res = await topicServiceClient.listTopics(req, null);
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to fetch non-partitioned topics. ${res.getStatus()?.getMessage()}`);
        return [];
      }

      return res.getTopicsList();
    },
    swrConfiguration
  );

  if (nonPartitionedTopicFqnsError) {
    notifyError(`Unable to fetch non-partitioned topics. ${nonPartitionedTopicFqnsError.toString()}`);
  }

  const { data: partitionedTopicFqns, error: partitionedTopicFqnsError } = useSWR<string[]>(
    props.isFetchData ? swrKeys.pulsar.tenants.tenant.namespaces.namespace.partitionedTopics._({ tenant: props.tenant, namespace: props.namespace }) : null,
    async () => {
      const req = new topicsPb.ListPartitionedTopicsRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);

      const res = await topicServiceClient.listPartitionedTopics(req, null);
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to fetch partitioned topics. ${res.getStatus()?.getMessage()}`);
        return [];
      }

      return res.getTopicsList();
    },
    swrConfiguration
  );

  if (partitionedTopicFqnsError) {
    notifyError(`Unable to fetch partitioned topics. ${partitionedTopicFqnsError.toString()}`);
  }

  const [persistentPartitionedTopics, nonPersistentPartitionedTopics] = partition(partitionedTopicFqns, (t) => t.startsWith('persistent'))
  const [persistentNonPartitionedTopics, nonPersistentNonPartitionedTopics] = partition(nonPartitionedTopicFqns, (t) => t.startsWith('persistent'));

  const persistentTreeNodes = persistentPartitionedTopics.map(t => topicTreeNodeFromFqn(t, true))
    .concat(persistentNonPartitionedTopics.map(t => topicTreeNodeFromFqn(t, false)))
    .sort((a, b) => customTopicsNamesSort(a.topicFqn, b.topicFqn));

  const nonPersistentTreeNodes = nonPersistentPartitionedTopics.map(t => topicTreeNodeFromFqn(t, true))
    .concat(nonPersistentNonPartitionedTopics.map(t => topicTreeNodeFromFqn(t, false)))
    .sort((a, b) => customTopicsNamesSort(a.topicFqn, b.topicFqn));

  useEffect(
    () => props.onTopics({
      persistent: persistentTreeNodes,
      nonPersistent: nonPersistentTreeNodes
    }),
    [nonPartitionedTopicFqns, partitionedTopicFqns, props.forceReloadKey]
  );

  const resourceFqn = `${props.tenant}/${props.namespace}`;
  return (
    <Link
      to={routes.tenants.tenant.namespaces.namespace.overview._.get({ tenant: props.tenant, namespace: props.namespace })}
      className={`${s.NodeLink} ${props.isActive ? s.NodeLinkActive : ''}`}
      style={{ paddingLeft: props.leftIndent }}
      onDoubleClick={props.onDoubleClick}
    >
      <span className={s.NodeLinkText}>{props.namespace}</span>

      <div className={s.CopyResourceFqnButton}>
        <SmallButton
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            navigator.clipboard.writeText(resourceFqn);
            notifySuccess(<div>Fully qualified resource name copied to clipboard: {resourceFqn}</div>, Date.now().toString());
          }}
          svgIcon={copyIcon}
          type={"regular"}
          title={`Copy resource FQN: ${resourceFqn}`}
          appearance="borderless-semitransparent"
        />
      </div>
    </Link>
  );
}

export type PulsarTopicProps = {
  treeNode: TreeNode,
  leftIndent: string;
  onDoubleClick: () => void;
  isActive: boolean;
  isFetchData: boolean;
}
const replacePartitionRegexp = /(.*)-(partition-\d+$)/;
export const PulsarTopic: React.FC<PulsarTopicProps> = (props) => {
  const treeNode = props.treeNode;
  if (treeNode.type !== 'topic') {
    return <></>;
  }

  const { notifySuccess } = Notifications.useContext();

  return (
    <Link
      to={routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.overview._.get({ tenant: treeNode.tenant, namespace: treeNode.namespace, topic: treeNode.topic, topicPersistency: treeNode.persistency })}
      className={`${s.NodeLink} ${props.isActive ? s.NodeLinkActive : ''}`}
      style={{ paddingLeft: props.leftIndent }}
      onDoubleClick={props.onDoubleClick}
    >
      <span className={s.NodeLinkText}>{treeNode.topic.replace(replacePartitionRegexp, "$2")}</span>

      <div className={s.CopyResourceFqnButton}>
        <SmallButton
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            navigator.clipboard.writeText(treeNode.topicFqn);
            notifySuccess(<div>Fully qualified resource name copied to clipboard: {treeNode.topicFqn}</div>, Date.now().toString());
          }}
          svgIcon={copyIcon}
          type={"regular"}
          title={`Copy resource FQN: ${treeNode.topicFqn}`}
          appearance="borderless-semitransparent"
        />
      </div>
    </Link>
  );
}
