import React from 'react';
import { BreadCrumbsAtPageTop } from '../ui/BreadCrumbs/BreadCrumbs';
import s from './TopicPage.module.css'
import Toolbar from '../ui/Toolbar/Toolbar';
import Session from './Messages/Messages';
import Policies from './Policies/Policies';
import DeleteTopic from './DeleteTopic/DeleteTopic';
import { routes } from '../routes';

export type TopicPageView = 'messages' | 'overview' | 'policies' | 'delete-topic';
export type TopicPageProps = {
  view: TopicPageView;
  tenant: string;
  namespace: string;
  topic: string;
  topicType: 'persistent' | 'non-persistent';
};

const TopicPage: React.FC<TopicPageProps> = (props) => {
  const key = `${props.tenant}-${props.namespace}-${props.topic}`;

  return (
    <div className={s.Page}>
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
        buttons={[
          {
            linkTo: routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.messages._.get({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, topicType: props.topicType }),
            text: 'Messages',
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
            linkTo: routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.policies._.get({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, topicType: props.topicType }),
            text: 'Policies',
            onClick: () => { },
            type: 'regular'
          },
          {
            linkTo: routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.deleteTopic._.get({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, topicType: props.topicType }),
            text: 'Delete',
            onClick: () => { },
            type: 'danger'
          }
        ]}
      />

      {props.view === 'messages' && (
        <Session
          key={key}
          config={{
            topicsSelector: { type: 'by-names', topics: [`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`] },
            startFrom: { type: 'latest' }
          }}
        />
      )}
      {props.view === 'policies' && <Policies key={key} tenant={props.tenant} namespace={props.namespace} topic={props.topic} topicType={props.topicType} />}
      {props.view === 'delete-topic' && <DeleteTopic key={key} tenant={props.tenant} namespace={props.namespace} topic={props.topic} topicType={props.topicType} />}
    </div>
  );
}

export default TopicPage;
