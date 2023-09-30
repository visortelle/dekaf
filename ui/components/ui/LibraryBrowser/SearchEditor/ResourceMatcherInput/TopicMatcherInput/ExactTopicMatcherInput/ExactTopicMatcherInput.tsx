import React from 'react';
import s from './ExactTopicMatcherInput.module.css'
import Input from '../../../../../Input/Input';
import NamespaceMatcherInput from '../../NamespaceMatcherInput/NamespaceMatcherInput';
import FormItem from '../../../../../ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../../../../ConfigurationTable/FormLabel/FormLabel';
import { ExactTopicMatcher } from '../../../../model/resource-matchers';

export type ExactTopicMatcherInputProps = {
  value: ExactTopicMatcher;
  onChange: (value: ExactTopicMatcher) => void;
};

const ExactTopicMatcherInput: React.FC<ExactTopicMatcherInputProps> = (props) => {
  return (
    <div className={s.ExactTopicMatcherInput}>
      <FormItem>
        <FormLabel content="Topic Name" />
        <Input value={props.value.topic} onChange={(v) => props.onChange({ ...props.value, topic: v })} />
      </FormItem>

      <FormItem>
        <NamespaceMatcherInput value={props.value.namespace} onChange={(v) => props.onChange({ ...props.value, namespace: v })} />
      </FormItem>
    </div>
  );
}

export default ExactTopicMatcherInput;
