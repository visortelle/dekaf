import React from 'react';
import s from './ResourceMatcherInput.module.css'
import TenantMatcherInput from './TenantMatcherInput/TenantMatcherInput';
import NamespaceMatcherInput from './NamespaceMatcherInput/NamespaceMatcherInput';
import TopicMatcherInput from './TopicMatcherInput/TopicMatcherInput';
import { ResourceMatcher } from '../../../model/resource-matchers';
import Select from '../../../../Select/Select';
import { getDefaultInstanceMatcher, getDefaultNamespaceMatcher, getDefaultTenantMatcher, getDefaultTopicMatcher } from './default-matchers';
import FormItem from '../../../../ConfigurationTable/FormItem/FormItem';

export type ResourceMatcherInputProps = {
  value: ResourceMatcher;
  onChange: (value: ResourceMatcher) => void;
  isReadOnly?: boolean;
};

const ResourceMatcherInput: React.FC<ResourceMatcherInputProps> = (props) => {
  return (
    <div className={s.ResourceMatcherInput}>
      <FormItem size='small'>
        <div style={{ display: 'flex', gap: '4rem', alignItems: 'center' }}>
          <strong>Select</strong>
          <Select<ResourceMatcher['type']>
            size="small"
            value={props.value.type}
            onChange={(v) => {
              switch (v) {
                case "instance-matcher": props.onChange(getDefaultInstanceMatcher()); return;
                case "topic-matcher": props.onChange(getDefaultTopicMatcher()); return;
                case "namespace-matcher": props.onChange(getDefaultNamespaceMatcher()); return;
                case "tenant-matcher": props.onChange(getDefaultTenantMatcher()); return;
              }
            }}
            list={[
              { type: 'item', value: 'instance-matcher', title: 'Instance' },
              { type: 'item', value: 'tenant-matcher', title: 'Tenant(s)' },
              { type: 'item', value: 'namespace-matcher', title: 'Namespace(s)' },
              { type: 'item', value: 'topic-matcher', title: 'Topic(s)' },
            ]}
            isReadOnly={props.isReadOnly}
          />
        </div>

      </FormItem>

      {props.value.type === 'tenant-matcher' && (
        <TenantMatcherInput
          value={props.value}
          onChange={props.onChange}
          isReadOnly={props.isReadOnly}
        />
      )}
      {props.value.type === 'namespace-matcher' && (
        <NamespaceMatcherInput
          value={props.value}
          onChange={props.onChange}
          isReadOnly={props.isReadOnly}
        />
      )}
      {props.value.type === 'topic-matcher' && (
        <TopicMatcherInput
          value={props.value}
          onChange={props.onChange}
          isReadOnly={props.isReadOnly}
        />
      )}
    </div>
  );
}

export default ResourceMatcherInput;
