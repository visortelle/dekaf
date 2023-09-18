import React from 'react';
import s from './TopicMatcherInput.module.css';
import Select from '../../../../Select/Select';
import ExactTopicMatcherInput from './ExactTopicMatcherInput/ExactTopicMatcherInput';
import RegexTopicMatcherInput from './RegexTopicMatcherInput/RegexTopicMatcherInput';
import FormItem from '../../../../ConfigurationTable/FormItem/FormItem';
import ResourceFormLabel from '../ui/ResourceFormLabel/ResourceFormLabel';
import { TopicMatcherType, TopicMatcher } from '../../../types';

export type TopicMatcherInputProps = {
  value: TopicMatcher;
  onChange: (value: TopicMatcher) => void;
};

const TopicMatcherInput: React.FC<TopicMatcherInputProps> = (props) => {
  return (
    <div className={s.TopicMatcherInput}>
      <FormItem>
        <ResourceFormLabel type='topic' />
        <Select<TopicMatcherType>
          value={props.value.value.type}
          onChange={(v) => {
            if (v === 'exact-topic-matcher') {
              props.onChange({
                type: 'topic-matcher',
                value: {
                  type: 'exact-topic-matcher',
                  namespace: props.value.value.namespace, topic: ''
                }
              });
            } else if (v === 'regex-topic-matcher') {
              props.onChange({
                type: 'topic-matcher',
                value: {
                  type: 'regex-topic-matcher',
                  namespace: props.value.value.namespace, topicRegex: ''
                }
              });
            }
          }}
          list={[
            { type: 'item', value: 'exact-topic-matcher', title: 'Exact' },
            { type: 'item', value: 'regex-topic-matcher', title: 'Regex' },
          ]}
        />
      </FormItem>

      {props.value.value.type === 'exact-topic-matcher' && (
        <ExactTopicMatcherInput
          value={props.value.value}
          onChange={(v) => props.onChange({ ...props.value, value: v })}
        />
      )}
      {props.value.value.type === 'regex-topic-matcher' && (
        <RegexTopicMatcherInput
          value={props.value.value}
          onChange={(v) => props.onChange({ ...props.value, value: v })}
        />
      )}
    </div>
  );
}

export default TopicMatcherInput;
