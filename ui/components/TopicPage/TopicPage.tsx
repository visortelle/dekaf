import React, { useEffect, useState } from "react";

import * as Modals from "../app/contexts/Modals/Modals";
import { BreadCrumbsAtPageTop, Crumb, CrumbType } from "../ui/BreadCrumbs/BreadCrumbs";
import s from "./TopicPage.module.css";
import Toolbar, { ToolbarButtonProps } from "../ui/Toolbar/Toolbar";
import Session from "./Messages/Messages";
import Schema from "./Schema/Schema";
import Policies from "./Policies/Policies";
import Subscriptions from './Subscriptions/Subscriptions';
import DeleteDialog from "./DeleteDialog/DeleteDialog";
import { routes } from "../routes";
import { useNavigate } from "react-router";
import Producers from "./Producers/Producers";
import Overview from "./Overview/Overview";
import { matchPath, useLocation } from 'react-router-dom';
import { PulsarTopicPersistency } from "../pulsar/pulsar-resources";
import * as GrpcClient from '../app/contexts/GrpcClient/GrpcClient';
import * as pb from "../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb";
import { LibraryContext } from "../ui/LibraryBrowser/model/library-context";
import { getDefaultManagedItem } from "../ui/LibraryBrowser/default-library-items";
import { ManagedConsumerSessionConfig } from "../ui/LibraryBrowser/model/user-managed-items";

export type TopicPageView =
  | { type: "consumer-session", managedConsumerSessionId?: string }
  | { type: "overview" }
  | { type: "producers" }
  | { type: "schema-initial-screen" }
  | { type: "schema-create" }
  | { type: "schema-view"; schemaVersion: number }
  | { type: "policies" }
  | { type: "subscriptions" }
  | { type: "producers" };
export type TopicPageProps = {
  view: TopicPageView;
  tenant: string;
  namespace: string;
  topic: string;
  topicPersistency: PulsarTopicPersistency;
};

const partitionRegexp = /^(.*)-(partition-\d+)$/;

const TopicPage: React.FC<TopicPageProps> = (props) => {
  const modals = Modals.useContext();
  const navigate = useNavigate();
  const { topicServiceClient } = GrpcClient.useContext();

  const { pathname } = useLocation();

  const [isPartitioned, setIsPartitioned] = useState<boolean>();

  useEffect(() => {
    setIsPartitioned(false);

    const req = new pb.GetIsPartitionedTopicRequest();
    const topicFqn = `${props.topicPersistency}://${props.tenant}/${props.namespace}/${props.topic}`.replace(partitionRegexp, "$1");
    req.setTopicFqn(topicFqn);
    topicServiceClient.getIsPartitionedTopic(req, null)
      .then(res => setIsPartitioned(res.getIsPartitioned()))
      .catch(() => { });
  }, [props]);

  const isPartition = partitionRegexp.test(props.topic);
  const topicName = isPartition ? props.topic.replace(partitionRegexp, "$1") : props.topic;
  const partitionName = isPartition ? props.topic.replace(partitionRegexp, "$2") : undefined;

  let topicCrumbType: CrumbType;
  if (isPartitioned) {
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

  if (matchPath(routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.consumerSession._.path, pathname)) {
    extraCrumbs = extraCrumbs.concat([{ type: 'link', id: 'consumer-session', value: 'Messages' }]);
  } else if (matchPath(routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.overview._.path, pathname)) {
    extraCrumbs = extraCrumbs.concat([{ type: 'link', id: 'overview', value: 'Overview' }]);
  } else if (matchPath(routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.producers._.path, pathname)) {
    extraCrumbs = extraCrumbs.concat([{ type: 'link', id: 'producers', value: 'Producers' }]);
  } else if (matchPath(routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.schema._.path + '*', pathname)) {
    extraCrumbs = extraCrumbs.concat([{ type: 'link', id: 'schema', value: 'Schema' }]);
  } else if (matchPath(routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.policies._.path, pathname)) {
    extraCrumbs = extraCrumbs.concat([{ type: 'link', id: 'policies', value: 'Policies' }]);
  } else if (matchPath(routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.subscriptions._.path, pathname)) {
    extraCrumbs = extraCrumbs.concat([{ type: 'link', id: 'subscriptions', value: 'Subscriptions' }]);
  }

  const key = `${props.tenant}-${props.namespace}-${props.topic}`;

  let buttons: ToolbarButtonProps[] = [
    {
      linkTo: routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.overview._.get({
        tenant: props.tenant,
        namespace: props.namespace,
        topic: props.topic,
        topicPersistency: props.topicPersistency,
      }),
      text: "Overview",
      onClick: () => { },
      type: "regular",
      active: Boolean(matchPath(routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.overview._.path, pathname))
    },
    {
      linkTo: routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.consumerSession._.get({
        tenant: props.tenant,
        namespace: props.namespace,
        topic: props.topic,
        topicPersistency: props.topicPersistency,
      }),
      text: "Consume",
      onClick: () => { },
      type: "regular",
      active: Boolean(matchPath(routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.consumerSession._.path, pathname))
    },
    {
      linkTo: routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.consumerSession._.get({
        tenant: props.tenant,
        namespace: props.namespace,
        topic: props.topic,
        topicPersistency: props.topicPersistency,
      }),
      text: "Produce",
      onClick: () => { },
      type: "regular",
      active: false
    },
    {
      linkTo: routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.subscriptions._.get({
        tenant: props.tenant,
        namespace: props.namespace,
        topic: props.topic,
        topicPersistency: props.topicPersistency,
      }),
      text: "Subscriptions",
      onClick: () => { },
      type: "regular",
      active: Boolean(matchPath(routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.subscriptions._.path, pathname))
    },
    {
      linkTo: routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.producers._.get({
        tenant: props.tenant,
        namespace: props.namespace,
        topic: props.topic,
        topicPersistency: props.topicPersistency,
      }),
      text: "Producers",
      onClick: () => { },
      type: "regular",
      active: Boolean(matchPath(routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.producers._.path, pathname))
    },
  ];

  // Topic policies aren't supported for non-persistent topics yet (Pulsar v2.11.0)
  if (props.topicPersistency === "persistent") {
    buttons = buttons.concat([
      {
        linkTo: routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.policies._.get({
          tenant: props.tenant,
          namespace: props.namespace,
          topic: props.topic,
          topicPersistency: props.topicPersistency,
        }),
        text: "Policies",
        onClick: () => { },
        position: 'right',
        type: "regular",
        testId: "topic-policies-button",
        active: Boolean(matchPath(routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.policies._.path, pathname))
      },
    ]);
  }

  buttons = buttons.concat([
    {
      linkTo: routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.schema._.get({
        tenant: props.tenant,
        namespace: props.namespace,
        topic: props.topic,
        topicPersistency: props.topicPersistency,
      }),
      text: "Schema",
      onClick: () => { },
      type: "regular",
      position: 'right',
      active: Boolean(matchPath(routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.schema._.path + '/*', pathname))
    },
    {
      text: "Delete",
      type: "danger",
      position: 'right',
      testId: "topic-page-delete-button",
      onClick: () =>
        modals.push({
          id: "delete-topic",
          title: `Delete Topic`,
          content: (
            <DeleteDialog
              tenant={props.tenant}
              namespace={props.namespace}
              topic={props.topic}
              topicPersistency={props.topicPersistency}
              navigate={navigate}
            />
          ),
          styleMode: "no-content-padding",
        }),
    }
  ]);

  const libraryContext: LibraryContext = {
    pulsarResource: {
      type: 'topic',
      topicPersistency: props.topicPersistency,
      tenant: props.tenant,
      namespace: props.namespace,
      topic: props.topic,
    }
  };

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
            value: topicName,
            type: topicCrumbType,
          },
          ...extraCrumbs
        ]}
      />
      <Toolbar buttons={buttons} />

      {props.view.type === "consumer-session" && (
        <Session
          key={key}
          libraryContext={libraryContext}
          initialConfig={props.view.managedConsumerSessionId === undefined ? {
            type: 'value',
            val: getDefaultManagedItem("consumer-session-config", libraryContext) as ManagedConsumerSessionConfig
          } : {
            type: 'reference',
            ref: props.view.managedConsumerSessionId
          }}
        />
      )}

      {props.view.type === "schema-initial-screen" && (
        <Schema
          key={key}
          tenant={props.tenant}
          namespace={props.namespace}
          topic={props.topic}
          topicPersistency={props.topicPersistency}
          view={{ type: "initial-screen" }}
        />
      )}
      {props.view.type === "schema-create" && (
        <Schema
          key={key}
          tenant={props.tenant}
          namespace={props.namespace}
          topic={props.topic}
          topicPersistency={props.topicPersistency}
          view={{ type: "create-schema" }}
        />
      )}
      {props.view.type === "schema-view" && (
        <Schema
          key={key}
          tenant={props.tenant}
          namespace={props.namespace}
          topic={props.topic}
          topicPersistency={props.topicPersistency}
          view={{ type: "view-schema", schemaVersion: props.view.schemaVersion }}
        />
      )}
      {props.view.type === "overview" && (
        <Overview key={key} tenant={props.tenant} namespace={props.namespace} topic={props.topic} topicPersistency={props.topicPersistency} libraryContext={libraryContext} />
      )}
      {props.view.type === "policies" && (
        <Policies key={key} tenant={props.tenant} namespace={props.namespace} topic={props.topic} topicPersistency={props.topicPersistency} />
      )}
      {props.view.type === "producers" && (
        <Producers key={key} tenant={props.tenant} namespace={props.namespace} topic={props.topic} topicPersistency={props.topicPersistency} />
      )}
      {props.view.type === "subscriptions" && (
        <Subscriptions key={key} tenant={props.tenant} namespace={props.namespace} topic={props.topic} topicPersistency={props.topicPersistency} />
      )}
    </div>
  );
};

export default TopicPage;
