import React from 'react';
import s from './ResourceFormLabel.module.css'
import { TenantIcon, NamespaceIcon, TopicIcon } from '../../../../../../Icons/Icons';

export type ResourceFormLabelProps = {
  type: 'tenant' | 'namespace' | 'topic';
};

const ResourceFormLabel: React.FC<ResourceFormLabelProps> = (props) => {
  return (
    <div className={s.ResourceFormLabel}>
      {props.type === 'tenant' && <TenantIcon size='small' />}
      {props.type === 'namespace' && <NamespaceIcon size='small' />}
      {props.type === 'topic' && <TopicIcon topicPersistency='persistent' size='small' />}
    </div>
  );
}

export default ResourceFormLabel;
