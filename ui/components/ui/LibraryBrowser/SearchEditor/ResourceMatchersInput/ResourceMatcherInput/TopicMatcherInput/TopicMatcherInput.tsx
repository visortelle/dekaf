import React from 'react';
import s from './TopicMatcherInput.module.css';
import Select from '../../../../../Select/Select';
import ExactTopicMatcherInput from './ExactTopicMatcherInput/ExactTopicMatcherInput';
import AllTopicMatcherInput from './AllTopicMatcherInput/AllTopicMatcherInput';
import FormItem from '../../../../../ConfigurationTable/FormItem/FormItem';
import ResourceFormLabel from '../ui/ResourceFormLabel/ResourceFormLabel';
import { TopicMatcherType, TopicMatcher } from '../../../../model/resource-matchers';
import { v4 as uuid } from 'uuid';

export type TopicMatcherInputProps = {
  value: TopicMatcher;
  onChange: (value: TopicMatcher) => void;
  isReadOnly?: boolean;
};

const TopicMatcherInput: React.FC<TopicMatcherInputProps> = (props) => {
  return (
    <div className={s.TopicMatcherInput}>
      <FormItem size='small'>
        <div style={{ display: 'flex', gap: '4rem', alignItems: 'center' }}>
          <ResourceFormLabel type='topic' />
          <Select<TopicMatcherType>
            isReadOnly={props.isReadOnly}
            size='small'
            value={props.value.value.type}
            onChange={(v) => {
              if (v === 'exact-topic-matcher') {
                props.onChange({
                  type: 'topic-matcher',
                  value: {
                    type: 'exact-topic-matcher',
                    namespace: props.value.value.namespace,
                    topic: '',
                    reactKey: uuid()
                  },
                  reactKey: uuid()
                });
              } else if (v === 'all-topic-matcher') {
                props.onChange({
                  type: 'topic-matcher',
                  value: {
                    type: 'all-topic-matcher',
                    namespace: props.value.value.namespace,
                    reactKey: uuid()
                  },
                  reactKey: uuid()
                });
              }
            }}
            list={[
              { type: 'item', value: 'exact-topic-matcher', title: 'exact name' },
              { type: 'item', value: 'all-topic-matcher', title: 'all' },
            ]}
          />
        </div>
      </FormItem>

      {props.value.value.type === 'exact-topic-matcher' && (
        <ExactTopicMatcherInput
          value={props.value.value}
          onChange={(v) => props.onChange({ ...props.value, value: v })}
          isReadOnly={props.isReadOnly}
        />
      )}
      {props.value.value.type === 'all-topic-matcher' && (
        <AllTopicMatcherInput
          value={props.value.value}
          onChange={(v) => props.onChange({ ...props.value, value: v })}
          isReadOnly={props.isReadOnly}
        />
      )}
    </div>
  );
}

export default TopicMatcherInput;
