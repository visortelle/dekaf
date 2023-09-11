import React from 'react';
import s from './RegexTopicMatcher.module.css'
import Input from '../../../../../Input/Input';
import NamespaceMatcher, { NamespaceMatcherValue } from '../../NamespaceMatcher/NamespaceMatcher';
import FormItem from '../../../../../ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../../../../ConfigurationTable/FormLabel/FormLabel';

export type RegexTopicMatcherValue = {
  type: 'regex-topic-matcher',
  namespace: NamespaceMatcherValue;
  topicRegex: string;
};

export type RegexTopicMatcherProps = {
  value: RegexTopicMatcherValue;
  onChange: (value: RegexTopicMatcherValue) => void;
};

const RegexTopicMatcher: React.FC<RegexTopicMatcherProps> = (props) => {
  return (
    <div className={s.RegexTopicMatcher}>
      <FormItem>
        <FormLabel content="Topic Name Regex" />
        <Input
          value={props.value.topicRegex}
          onChange={(v) => props.onChange({ ...props.value, topicRegex: v })}
          placeholder='.*'
        />
      </FormItem>

      <FormItem>
        <NamespaceMatcher value={props.value.namespace} onChange={(v) => props.onChange({ ...props.value, namespace: v })} />
      </FormItem>
    </div>
  );
}

export default RegexTopicMatcher;
