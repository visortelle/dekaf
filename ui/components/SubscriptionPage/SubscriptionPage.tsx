import React from "react";

import {BreadCrumbsAtPageTop, Crumb, CrumbType} from "../ui/BreadCrumbs/BreadCrumbs";
import s from "./SubscriptionPage.module.css";
import Toolbar, { ToolbarButtonProps } from "../ui/Toolbar/Toolbar";
import { routes } from "../routes";
import Consumers from "./Consumers/Consumers";
import { matchPath, useLocation } from 'react-router-dom';
import { PulsarTopicPersistency } from "../pulsar/pulsar-resources";
import useSwr from "swr";
import {swrKeys} from "../swrKeys";
import * as pb from "../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb";
import {Code} from "../../grpc-web/google/rpc/code_pb";
import * as Modals from "../app/contexts/Modals/Modals";
import * as Notifications from "../app/contexts/Notifications";
import * as GrpcClient from "../app/contexts/GrpcClient/GrpcClient";
import DeleteSubscriptionDialog from "./DeleteSubscriptionDialog/DeleteSubscriptionDialog";
import {useNavigate} from "react-router";
import Overview from "./Overview/Overview";

export type SubscriptionPageView = { "type": "overview" } | { type: "consumers" };

export type SubscriptionPageProps = {
  view: SubscriptionPageView;
  tenant: string;
  namespace: string;
  topic: string;
  topicPersistency: PulsarTopicPersistency;
  subscription: string;
};

const partitionRegexp = /^(.*)-(partition-\d+)$/;

export type PartitioningWithActivePartitions = { isPartitioned: boolean, partitionsCount: number | undefined, activePartitionsCount: number | undefined };

const SubscriptionPage: React.FC<SubscriptionPageProps> = (props) => {
  const modals = Modals.useContext();
  const { notifyError } = Notifications.useContext();
  const { topicServiceClient } = GrpcClient.useContext();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const topicFqn = `${props.topicPersistency}://${props.tenant}/${props.namespace}/${props.topic}`;

  const { data: partitioning, error: partitioningError } = useSwr(
    swrKeys.pulsar.customApi.metrics.isPartitionedTopic._(topicFqn),
    async () => {
      const req = new pb.GetIsPartitionedTopicRequest();
      req.setTopicFqn(topicFqn);

      const res = await topicServiceClient.getIsPartitionedTopic(req, null)
        .catch(err => notifyError(`Unable to get topic partitioning: ${err}`));
      if (res === undefined) {
        return;
      }

      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get topic partitioning: ${res.getStatus()?.getMessage()}`)
        return;
      }

      const result: PartitioningWithActivePartitions = {
        isPartitioned: res.getIsPartitioned(),
        partitionsCount: res.getPartitionsCount()?.getValue(),
        activePartitionsCount: res.getActivePartitionsCount()?.getValue()
      };

      return result;
    },
    { refreshInterval: 15_000 }
  );

  if (partitioningError !== undefined) {
    notifyError(`Unable to get topic partitioning. ${partitioningError}`);
  }

  const isPartition = partitionRegexp.test(props.topic);
  const topicName = isPartition ? props.topic.replace(partitionRegexp, "$1") : props.topic;
  const partitionName = isPartition ? props.topic.replace(partitionRegexp, "$2") : undefined;

  let topicCrumbType: CrumbType;
  if (partitioning?.isPartitioned) {
    topicCrumbType = props.topicPersistency === "persistent" ? "persistent-topic-partitioned" : "non-persistent-topic-partitioned"
  } else {
    topicCrumbType = props.topicPersistency === "persistent" ? "persistent-topic" : "non-persistent-topic"
  }

  let extraCrumbs: Crumb[] = isPartition ?
    [{
      type: props.topicPersistency === "persistent" ? "persistent-topic-partition" : "non-persistent-topic-partition",
      id: isPartition ? partitionName! : topicName,
      value: isPartition ? partitionName! : topicName,
    }] :
    [];

  if (matchPath(routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.subscriptions.subscription.overview._.path, pathname)) {
    extraCrumbs = [{ type: 'link', id: 'overview', value: 'Overview' }]
  } else if (matchPath(routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.subscriptions.subscription.consumers._.path, pathname)) {
    extraCrumbs = [{ type: 'link', id: 'consumers', value: 'Consumers' }]
  }

  const key = `${props.topicPersistency}-${props.tenant}-${props.namespace}-${props.topic}-${props.subscription}`;

  let buttons: ToolbarButtonProps[] = [
    {
      linkTo: routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.subscriptions.subscription.overview._.get({
        tenant: props.tenant,
        namespace: props.namespace,
        topic: props.topic,
        topicPersistency: props.topicPersistency,
        subscription: props.subscription,
      }),
      text: "Overview",
      onClick: () => { },
      type: "regular",
    },
    {
      linkTo: routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.subscriptions.subscription.consumers._.get({
        tenant: props.tenant,
        namespace: props.namespace,
        topic: props.topic,
        topicPersistency: props.topicPersistency,
        subscription: props.subscription,
      }),
      text: "Consumers",
      onClick: () => { },
      type: "regular",
    },
    {
      text: "Delete",
      type: "danger",
      position: 'left',
      testId: "subscription-page-delete-button",
      onClick: () =>
        modals.push({
          id: "delete-subscription",
          title: `Delete`,
          content: (
            <DeleteSubscriptionDialog
              tenant={props.tenant}
              namespace={props.namespace}
              topic={props.topic}
              topicPersistency={props.topicPersistency}
              subscription={props.subscription}
              navigate={navigate}
            />
          ),
          styleMode: "no-content-padding",
        }),
    },
  ];

  return (
    <div className={s.Page}>
      <BreadCrumbsAtPageTop
        crumbs={[
          {
            id: `instance`,
            value: "Pulsar",
            type: "instance",
          },
          {
            id: `tenant-${props.tenant}`,
            value: props.tenant,
            type: "tenant",
          },
          {
            id: `namespace-${props.namespace}`,
            value: props.namespace,
            type: "namespace",
          },
          {
            id: `topic-${props.topic}`,
            value: props.topic,
            type: topicCrumbType
          },
          {
            id: `subscription-${props.topic}`,
            value: props.subscription,
            type: 'subscription'
          },
          ...extraCrumbs
        ]}
      />
      <Toolbar buttons={buttons} />

      {props.view.type === "overview" && (
        <Overview
          key={key}
          tenant={props.tenant}
          namespace={props.namespace}
          topic={props.topic}
          topicPersistency={props.topicPersistency}
          subscription={props.subscription}
        />
      )}
      {props.view.type === "consumers" && (
        <Consumers
          key={key}
          tenant={props.tenant}
          namespace={props.namespace}
          topic={props.topic}
          topicPersistency={props.topicPersistency}
          subscription={props.subscription}
        />
      )}
    </div>
  );
};

export default SubscriptionPage;
