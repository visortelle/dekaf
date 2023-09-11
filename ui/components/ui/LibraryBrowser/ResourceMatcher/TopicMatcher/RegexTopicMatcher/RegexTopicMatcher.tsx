import React from 'react';
import s from './RegexNamespaceMatcher.module.css'
import Input from '../../../../Input/Input';
import NamespaceMatcher, { NamespaceMatcherValue } from '../../NamespaceMatcher/NamespaceMatcher';

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
      <NamespaceMatcher value={props.value.namespace} onChange={(v) => props.onChange({ ...props.value, namespace: v })} />
      <Input value={props.value.topicRegex} onChange={(v) => props.onChange({ ...props.value, topicRegex: v })} />
    </div>
  );
}

export default RegexTopicMatcher;
