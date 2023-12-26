import React from 'react';
import s from './AllTopicMatcherInput.module.css'
import NamespaceMatcherInput from '../../NamespaceMatcherInput/NamespaceMatcherInput';
import FormItem from '../../../../../../ConfigurationTable/FormItem/FormItem';
import { AllTopicMatcher } from '../../../../../model/resource-matchers';

export type AllTopicMatcherInputProps = {
  value: AllTopicMatcher;
  onChange: (value: AllTopicMatcher) => void;
  isReadOnly?: boolean;
};

const AllTopicMatcherInput: React.FC<AllTopicMatcherInputProps> = (props) => {
  return (
    <div className={s.AllTopicMatcherInput}>
      <FormItem size='small'>
        <NamespaceMatcherInput
          value={props.value.namespace}
          onChange={(v) => props.onChange({ ...props.value, namespace: v })}
          isReadOnly={props.isReadOnly}
        />
      </FormItem>
    </div>
  );
}

export default AllTopicMatcherInput;
