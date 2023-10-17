import React from 'react';
import s from './ResourceMatcherInput.module.css'
import TenantMatcherInput from './TenantMatcherInput/TenantMatcherInput';
import NamespaceMatcherInput from './NamespaceMatcherInput/NamespaceMatcherInput';
import TopicMatcherInput from './TopicMatcherInput/TopicMatcherInput';
import { ResourceMatcher } from '../../../model/resource-matchers';
import SmallButton from '../../../../SmallButton/SmallButton';
import deleteIcon from './delete.svg';
import FormLabel from '../../../../ConfigurationTable/FormLabel/FormLabel';

export type ResourceMatcherInputProps = {
  value: ResourceMatcher;
  onChange: (value: ResourceMatcher) => void
  onDelete: () => void;
};

const ResourceMatcherInput: React.FC<ResourceMatcherInputProps> = (props) => {
  return (
    <div className={s.ResourceMatcherInput}>
      <FormLabel content="Pulsar Resource Matcher" />
      <div className={s.DeleteButton}>
        <SmallButton
          svgIcon={deleteIcon}
          title='Delete this Matcher'
          onClick={props.onDelete}
          type='danger'
        />
      </div>

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
