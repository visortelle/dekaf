import React from 'react';
import s from './TopicPage.module.css'
import { BreadCrumbsAtPageTop } from '../BreadCrumbs/BreadCrumbs';

export type TopicPageProps = {
  tenant: string;
  namespace: string;
  topic: string;
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
            type: 'topic',
          }
        ]}
      />
      topic page
    </div>
  );
}

export default TopicPage;
