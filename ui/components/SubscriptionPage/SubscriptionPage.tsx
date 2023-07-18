import React from "react";

import { BreadCrumbsAtPageTop, Crumb } from "../ui/BreadCrumbs/BreadCrumbs";
import s from "./SubscriptionPage.module.css";
import Toolbar, { ToolbarButtonProps } from "../ui/Toolbar/Toolbar";
import { routes } from "../routes";
import Consumers from "./Consumers/Consumers";
import { matchPath, useLocation } from 'react-router-dom';

export type SubscriptionPageView = { type: "consumers" }

export type TopicPageProps = {
  view: SubscriptionPageView;
  tenant: string;
  namespace: string;
  topic: string;
  topicType: "persistent" | "non-persistent";
  subscription: string;
};

const TopicPage: React.FC<TopicPageProps> = (props) => {
  const { pathname } = useLocation();
  let extraCrumbs: Crumb[] = [];
  if (matchPath(routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.subscriptions.subscription.consumers._.path, pathname)) {
    extraCrumbs = [{ type: 'link', id: 'consumers', value: 'Consumers' }]
  }

  const key = `${props.topicType}-${props.tenant}-${props.namespace}-${props.topic}-${props.subscription}`;

  let buttons: ToolbarButtonProps[] = [
    {
      linkTo: routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.subscriptions.subscription.consumers._.get({
        tenant: props.tenant,
        namespace: props.namespace,
        topic: props.topic,
        topicType: props.topicType,
        subscription: props.subscription,
      }),
      text: "Consumers",
      onClick: () => { },
      type: "regular",
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
            type: props.topicType === "persistent" ? "persistent-topic" : "non-persistent-topic",
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

      {props.view.type === "consumers" && (
        <Consumers
          key={key}
          tenant={props.tenant}
          namespace={props.namespace}
          topic={props.topic}
          topicType={props.topicType}
          subscription={props.subscription}
        />
      )}
    </div>
  );
};

export default TopicPage;
