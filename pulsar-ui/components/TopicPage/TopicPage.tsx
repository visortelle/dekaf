import React from 'react';
import { BreadCrumbsAtPageTop } from '../BreadCrumbs/BreadCrumbs';
import s from './TopicPage.module.css'
import Toolbar from '../ui/Toolbar/Toolbar';
import Policies from './Policies/Policies';

export type TopicPageView = 'overview' | 'policies' | 'delete-topic';
export type TopicPageProps = {
  view: TopicPageView;
  tenant: string;
  namespace: string;
  topic: string;
  type: 'persistent' | 'non-persistent';
};

const TopicPage: React.FC<TopicPageProps> = (props) => {
  return (
    <div className={s.Page}>
      <BreadCrumbsAtPageTop
        crumbs={[
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
            type: props.type === 'persistent' ? 'persistent-topic' : 'non-persistent-topic',
          }
        ]}
      />
      <Toolbar
        buttons={[
          {
            linkTo: `/tenants/${props.tenant}/namespaces/${props.namespace}/topics/${props.topic}`,
            title: 'Overview',
            onClick: () => { },
            type: 'regular'
          },
          {
            linkTo: `/tenants/${props.tenant}/namespaces/${props.namespace}/topics/${props.topic}/policies`,
            title: 'Policies',
            onClick: () => { },
            type: 'regular'
          },
          {
            linkTo: `/tenants/${props.tenant}/namespaces/${props.namespace}/topics/${props.topic}/delete-topic`,
            title: 'Delete',
            onClick: () => { },
            type: 'danger'
          }
        ]}
      />

      {props.view === 'policies' && <Policies tenant={props.tenant} namespace={props.namespace} topic={props.topic} topicType="persistent" />}
    </div>
  );
}

export default TopicPage;
