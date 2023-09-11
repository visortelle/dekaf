import React from 'react';
import s from './ExactTopicMatcher.module.css'
import Input from '../../../../Input/Input';
import NamespaceMatcher, { NamespaceMatcherValue } from '../../NamespaceMatcher/NamespaceMatcher';

export type ExactTopicMatcherValue = {
  type: 'exact-topic-matcher',
  namespace: NamespaceMatcherValue;
  topic: string;
};

export type ExactTopicMatcherProps = {
  value: ExactTopicMatcherValue;
  onChange: (value: ExactTopicMatcherValue) => void;
};

const ExactTopicMatcher: React.FC<ExactTopicMatcherProps> = (props) => {
  return (
    <div className={s.ExactTopicMatcher}>
      <NamespaceMatcher value={props.value.namespace} onChange={(v) => props.onChange({ ...props.value, namespace: v })} />
      <Input value={props.value.topic} onChange={(v) => props.onChange({ ...props.value, topic: v })} />
    </div>
  );
}

export default ExactTopicMatcher;
