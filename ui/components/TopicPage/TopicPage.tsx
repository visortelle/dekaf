import React from "react";

import * as Modals from "../app/contexts/Modals/Modals";
import { BreadCrumbsAtPageTop, Crumb } from "../ui/BreadCrumbs/BreadCrumbs";
import { v4 as uuid } from 'uuid';
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

export type TopicPageView =
  | { type: "messages" }
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

const TopicPage: React.FC<TopicPageProps> = (props) => {
  const modals = Modals.useContext();
  const navigate = useNavigate();

  const { pathname } = useLocation();
  let extraCrumbs: Crumb[] = [];
  if (matchPath(routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.messages._.path, pathname)) {
    extraCrumbs = [{ type: 'link', id: 'messages', value: 'Messages' }]
  } else if (matchPath(routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.overview._.path, pathname)) {
    extraCrumbs = [{ type: 'link', id: 'overview', value: 'Overview' }]
  } else if (matchPath(routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.producers._.path, pathname)) {
    extraCrumbs = [{ type: 'link', id: 'producers', value: 'Producers' }]
  } else if (matchPath(routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.schema._.path + '*', pathname)) {
    extraCrumbs = [{ type: 'link', id: 'schema', value: 'Schema' }]
  } else if (matchPath(routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.policies._.path, pathname)) {
    extraCrumbs = [{ type: 'link', id: 'policies', value: 'Policies' }]
  } else if (matchPath(routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.subscriptions._.path, pathname)) {
    extraCrumbs = [{ type: 'link', id: 'subscriptions', value: 'Subscriptions' }]
  }

  const key = `${props.tenant}-${props.namespace}-${props.topic}`;

  let buttons: ToolbarButtonProps[] = [
    {
      linkTo: routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.messages._.get({
        tenant: props.tenant,
        namespace: props.namespace,
        topic: props.topic,
        topicPersistency: props.topicPersistency,
      }),
      text: "Messages",
      onClick: () => { },
      type: "regular",
    },
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
    },
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
        type: "regular",
        testId: "topic-policies-button",
      },
    ]);
  }

  buttons = buttons.concat([
    {
      text: "Delete",
      type: "danger",
      testId: "topic-page-delete-button",
      onClick: () =>
        modals.push({
          id: "delete-topic",
          title: `Delete topic`,
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
    },
  ]);

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
            type: props.topicPersistency === "persistent" ? "persistent-topic" : "non-persistent-topic",
          },
          ...extraCrumbs
        ]}
      />
      <Toolbar buttons={buttons} />

      {props.view.type === "messages" && (
        <Session
          key={key}
          libraryContext={{
            pulsarResource: {
              type: 'topic',
              topicPersistency: props.topicPersistency,
              tenant: props.tenant,
              namespace: props.namespace,
              topic: props.topic,
            }
          }}
          initialConfig={{
            type: 'value',
            value: {
              metadata: {
                id: uuid(),
                name: '',
                descriptionMarkdown: '',
                type: 'consumer-session-config'
              },
              spec: {
                topicsSelector: { type: "by-names", topics: [`${props.topicPersistency}://${props.tenant}/${props.namespace}/${props.topic}`] },
                messageFilterChain: {
                  type: 'value',
                  value: {
                    metadata: {
                      id: uuid(),
                      name: '',
                      descriptionMarkdown: '',
                      type: 'message-filter-chain'
                    },
                    spec: {
                      filters: [], mode: "all", isEnabled: true, isNegated: false
                    }
                  }
                },
              },
            }
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
        <Overview key={key} tenant={props.tenant} namespace={props.namespace} topic={props.topic} topicPersistency={props.topicPersistency} />
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
