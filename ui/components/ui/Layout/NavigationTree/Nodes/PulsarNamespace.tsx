import React, {useEffect, useMemo} from "react";
import * as Notifications from "../../../../app/contexts/Notifications";
import * as GrpcClient from "../../../../app/contexts/GrpcClient/GrpcClient";
import useSWR from "swr";
import {swrKeys} from "../../../../swrKeys";
import * as topicsPb from "../../../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb";
import {Code} from "../../../../../grpc-web/google/rpc/code_pb";
import Link from "../../../Link/Link";
import {routes} from "../../../../routes";
import s from "../NavigationTree.module.css";
import  {NodesUtils, nodesSwrConfiguration} from "../utils/nodes-utils";

export type PulsarNamespaceProps = {
  forceReloadKey: number,
  tenant: string;
  namespace: string;
  onTopics: (topics: { persistent: string[], nonPersistent: string[] }) => void;
  leftIndent: string;
  onDoubleClick: () => void;
  isActive: boolean;
  isFetchData: boolean;
  customRender?: (props: PulsarNamespaceProps) => React.ReactElement;
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
    }, nodesSwrConfiguration
  );
  const persistentTopics = useMemo(() => (_persistentTopics || []).map(tn => NodesUtils.getTopicName(tn)), [_persistentTopics]);

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
    nodesSwrConfiguration
  );
  const nonPersistentTopics = useMemo(() => (_nonPersistentTopics || []).map(tn => NodesUtils.getTopicName(tn)), [_nonPersistentTopics]);

  if (nonPersistentTopicsError) {
    notifyError(`Unable to fetch non-persistent topics. ${persistentTopicsError.toString()}`);
  }

  useEffect(
    () => props.onTopics({
      persistent: NodesUtils.squashPartitionedTopics((persistentTopics || [])).sort((a, b) => a.localeCompare(b, 'en', { numeric: true })),
      nonPersistent: NodesUtils.squashPartitionedTopics((nonPersistentTopics || [])).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
    }),
    [persistentTopics, nonPersistentTopics, props.forceReloadKey]
  );

  return props.customRender?.(props) || (
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
