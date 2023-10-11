import React from 'react';
import s from './ResourceFormLabel.module.css'
import { TenantIcon, NamespaceIcon, TopicIcon } from '../../../../../../Icons/Icons';
import FormLabel from '../../../../../../ConfigurationTable/FormLabel/FormLabel';

export type ResourceFormLabelProps = {
  type: 'tenant' | 'namespace' | 'topic';
};

const ResourceFormLabel: React.FC<ResourceFormLabelProps> = (props) => {
  const content = (
    <div className={s.Content}>
      <div>
        {props.type === 'tenant' && <TenantIcon />}
        {props.type === 'namespace' && <NamespaceIcon />}
        {props.type === 'topic' && <TopicIcon topicPersistency='persistent' />}
      </div>
      <div>
        {props.type === 'tenant' && "Tenant Selector"}
        {props.type === 'namespace' && "Namespace Selector"}
        {props.type === 'topic' && "Topic Selector"}
      </div>
    </div>
  );

  return (
    <div className={s.ResourceFormLabel}>
      <FormLabel content={content} />
    </div>
  );
}

export default ResourceFormLabel;
