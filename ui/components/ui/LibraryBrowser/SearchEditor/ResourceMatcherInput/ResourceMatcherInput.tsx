import React from 'react';
import s from './ResourceMatcherInput.module.css'
import TenantMatcherInput from './TenantMatcherInput/TenantMatcherInput';
import NamespaceMatcherInput from './NamespaceMatcherInput/NamespaceMatcherInput';
import TopicMatcherInput from './TopicMatcherInput/TopicMatcherInput';
import { ResourceMatcher } from '../../model/resource-matchers';

export type ResourceMatcherInputProps = {
  value: ResourceMatcher;
  onChange: (value: ResourceMatcher) => void
};

const ResourceMatcherInput: React.FC<ResourceMatcherInputProps> = (props) => {
  return (
    <div className={s.ResourceMatcherInput}>
      {props.value.type === 'tenant-matcher' && (
        <TenantMatcherInput value={props.value} onChange={props.onChange} />
      )}
      {props.value.type === 'namespace-matcher' && (
        <NamespaceMatcherInput value={props.value} onChange={props.onChange} />
      )}
      {props.value.type === 'topic-matcher' && (
        <TopicMatcherInput value={props.value} onChange={props.onChange} />
      )}
    </div>
  );
}

export default ResourceMatcherInput;
