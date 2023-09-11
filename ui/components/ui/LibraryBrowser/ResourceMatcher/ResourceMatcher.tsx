import React from 'react';
import s from './ResourceMatcher.module.css'
import TenantMatcher, { TenantMatcherValue } from './TenantMatcher/TenantMatcher';
import NamespaceMatcher, { NamespaceMatcherValue } from './NamespaceMatcher/NamespaceMatcher';
import TopicMatcher, { TopicMatcherValue } from './TopicMatcher/TopicMatcher';

export type ResourceMatcherValue = TopicMatcherValue | NamespaceMatcherValue | TenantMatcherValue;

export type ResourceMatcherProps = {
  value: ResourceMatcherValue;
  onChange: (value: ResourceMatcherValue) => void
};

const ResourceMatcher: React.FC<ResourceMatcherProps> = (props) => {
  return (
    <div className={s.ResourceMatcher}>
      {props.value.type === 'tenant-matcher' && (
        <TenantMatcher value={props.value} onChange={props.onChange} />
      )}
      {props.value.type === 'namespace-matcher' && (
        <NamespaceMatcher value={props.value} onChange={props.onChange} />
      )}
      {props.value.type === 'topic-matcher' && (
        <TopicMatcher value={props.value} onChange={props.onChange} />
      )}
    </div>
  );
}

export default ResourceMatcher;
