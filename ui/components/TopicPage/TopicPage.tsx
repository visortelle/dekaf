import React from 'react';
import { useNavigate } from 'react-router';

import * as Modals from '../app/contexts/Modals/Modals';
import { BreadCrumbsAtPageTop } from '../ui/BreadCrumbs/BreadCrumbs';
import Toolbar, { ToolbarButtonProps } from '../ui/Toolbar/Toolbar';
import Session from './Messages/Messages';
import Schema from './Schema/Schema';
import Policies from './Policies/Policies';
import DeleteDialog from './DeleteDialog/DeleteDialog';
import { routes } from '../routes';

import s from './TopicPage.module.css'
import Head from '../ui/Head/Head';

export type TopicPageView = 'messages' | 'overview' | 'producers' | 'consumers' | 'schema' | 'policies';
export type TopicPageProps = {
  view: TopicPageView;
  tenant: string;
  namespace: string;
  topic: string;
  topicType: 'persistent' | 'non-persistent';
};

const TopicPage: React.FC<TopicPageProps> = (props) => {

  const modals = Modals.useContext();
  const navigate = useNavigate();

  const key = `${props.tenant}-${props.namespace}-${props.topic}`;

  let buttons: ToolbarButtonProps[] = [
    {
      linkTo: routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.messages._.get({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, topicType: props.topicType }),
      text: 'Messages',
      onClick: () => { },
      type: 'regular'
    },
    {
      linkTo: routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.overview._.get({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, topicType: props.topicType }),
      text: 'Producers',
      onClick: () => { },
      type: 'regular'
    },
    {
      linkTo: routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.overview._.get({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, topicType: props.topicType }),
      text: 'Consumers',
      onClick: () => { },
      type: 'regular'
    },
    {
      linkTo: routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.overview._.get({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, topicType: props.topicType }),
      text: 'Overview',
      onClick: () => { },
      type: 'regular'
    },
    {
      linkTo: routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.schema._.get({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, topicType: props.topicType }),
      text: 'Schema',
      onClick: () => { },
      type: 'regular'
    }
  ]

  // Topic policies aren't supported for non-persistent topics yet (Pulsar v2.10.3)
  if (props.topicType === 'persistent') {
    buttons = buttons.concat([
      {
        linkTo: routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.policies._.get({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, topicType: props.topicType }),
        text: 'Policies',
        onClick: () => { },
        type: 'regular',
        testId: 'topic-policies-button'
      }
    ]);
  }

  buttons = buttons.concat([{
    text: 'Delete',
    type: 'danger',
    testId: 'topic-page-delete-button',
    onClick: () => modals.push({
      id: 'delete-topic',
      title: `Delete topic`,
      content:
        <DeleteDialog
          tenant={props.tenant}
          namespace={props.namespace}
          topic={props.topic}
          topicType={props.topicType}
          navigate={navigate}
        />,
      styleMode: 'no-content-padding'
    }),
  }]);

  return (
    <div className={s.Page}>
      <Head page='topic' />

      <BreadCrumbsAtPageTop
        crumbs={[
          {
            id: `instance`,
            value: 'Pulsar',
            type: 'instance',
          },
          {
            id: `tenant-${props.tenant}`,
            value: props.tenant,
            type: 'tenant',
          },
          {
            id: `namespace-${props.namespace}`,
            value: props.namespace,
            type: 'namespace',
          },
          {
            id: `topic-${props.topic}`,
            value: props.topic,
            type: props.topicType === 'persistent' ? 'persistent-topic' : 'non-persistent-topic',
          }
        ]}
      />
      <Toolbar
        buttons={buttons}
      />

      {props.view === 'messages' && (
        <Session
          key={key}
          config={{
            topicsSelector: { type: 'by-names', topics: [`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`] },
            startFrom: { type: 'latest' },
            messageFilter: { filters: {}, disabledFilters: [], mode: 'all' },
          }}
        />
      )}

      {props.view === 'schema' && <Schema key={key} tenant={props.tenant} namespace={props.namespace} topic={props.topic} topicType={props.topicType} />}
      {props.view === 'policies' && <Policies key={key} tenant={props.tenant} namespace={props.namespace} topic={props.topic} topicType={props.topicType} />}
    </div>
  );
}

export default TopicPage;
