import React from 'react';
import s from './RegexTopicMatcherInput.module.css'
import Input from '../../../../../../Input/Input';
import NamespaceMatcherInput from '../../NamespaceMatcherInput/NamespaceMatcherInput';
import FormItem from '../../../../../../ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../../../../../ConfigurationTable/FormLabel/FormLabel';
import { RegexTopicMatcher } from '../../../../../model/resource-matchers';

export type RegexTopicMatcherInputProps = {
  value: RegexTopicMatcher;
  onChange: (value: RegexTopicMatcher) => void;
};

const RegexTopicMatcherInput: React.FC<RegexTopicMatcherInputProps> = (props) => {
  return (
    <div className={s.RegexTopicMatcherInput}>
      <FormItem size='small'>
        <Input
          size='small'
          value={props.value.topicRegex}
          onChange={(v) => props.onChange({ ...props.value, topicRegex: v })}
          placeholder='Use .* regex to match all topics'
        />
      </FormItem>

      <FormItem size='small'>
        <NamespaceMatcherInput value={props.value.namespace} onChange={(v) => props.onChange({ ...props.value, namespace: v })} />
      </FormItem>
    </div>
  );
}

export default RegexTopicMatcherInput;
