import React from 'react';
import s from './TopicMatcher.module.css';
import Select from '../../../Select/Select';
import ExactTopicMatcher, { ExactTopicMatcherValue } from './ExactTopicMatcher/ExactTopicMatcher';
import RegexTopicMatcher, { RegexTopicMatcherValue } from './RegexTopicMatcher/RegexTopicMatcher';

export type TopicMatcherValue = {
  type: 'topic-matcher',
  value: ExactTopicMatcherValue | RegexTopicMatcherValue
};
export type TopicMatcherType = TopicMatcherValue['value']['type'];

export type TopicMatcherProps = {
  value: TopicMatcherValue;
  onChange: (value: TopicMatcherValue) => void;
};

const TopicMatcher: React.FC<TopicMatcherProps> = (props) => {
  return (
    <div className={s.TopicMatcher}>
      <Select<TopicMatcherType>
        value={props.value.type}
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
              }});
          }
        }}
        list={[
          { type: 'item', value: 'exact-topic-matcher', title: 'Exact' },
          { type: 'item', value: 'regex-topic-matcher', title: 'Regex' },
        ]}
      />
      {props.value.value.type === 'exact-topic-matcher' && (
        <ExactTopicMatcher
          value={props.value.value}
          onChange={(v) => props.onChange({ ...props.value, value: v })}
        />
      )}
      {props.value.value.type === 'regex-topic-matcher' && (
        <RegexTopicMatcher
          value={props.value.value}
          onChange={(v) => props.onChange({ ...props.value, value: v })}
        />
      )}
    </div>
  );
}

export default TopicMatcher;
