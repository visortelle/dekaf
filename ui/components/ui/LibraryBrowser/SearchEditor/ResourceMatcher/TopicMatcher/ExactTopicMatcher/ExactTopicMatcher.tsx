import React from 'react';
import s from './ExactTopicMatcher.module.css'
import Input from '../../../../../Input/Input';
import NamespaceMatcher, { NamespaceMatcherValue } from '../../NamespaceMatcher/NamespaceMatcher';
import FormItem from '../../../../../ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../../../../ConfigurationTable/FormLabel/FormLabel';

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
      <FormItem>
        <FormLabel content="Topic Name" />
        <Input value={props.value.topic} onChange={(v) => props.onChange({ ...props.value, topic: v })} />
      </FormItem>
      
      <FormItem>
        <NamespaceMatcher value={props.value.namespace} onChange={(v) => props.onChange({ ...props.value, namespace: v })} />
      </FormItem>
    </div>
  );
}

export default ExactTopicMatcher;
