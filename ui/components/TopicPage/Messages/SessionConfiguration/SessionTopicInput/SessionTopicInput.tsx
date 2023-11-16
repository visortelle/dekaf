import React from 'react';
import s from './SessionTopicInput.module.css'
import { ConsumerSessionTopic } from '../../types';
import { TopicSelector } from '../../topic-selector/topic-selector';
import FormItem from '../../../../ui/ConfigurationTable/FormItem/FormItem';
import TopicSelectorInput from '../../topic-selector/TopicSelectorInput/TopicSelectorInput';
import { LibraryContext } from '../../../../ui/LibraryBrowser/model/library-context';
import FilterChainEditor from '../FilterChainEditor/FilterChainEditor';
import { useHover } from '../../../../app/hooks/use-hover';
import { UseManagedItemValueSpinner, useManagedItemValue } from '../../../../ui/LibraryBrowser/useManagedItemValue';
import { ManagedConsumerSessionTopic } from '../../../../ui/LibraryBrowser/model/user-managed-items';

export type SessionTopicInputProps = {
  value: ConsumerSessionTopic;
  onChange: (config: ConsumerSessionTopic) => void;
  libraryContext: LibraryContext;
};

const SessionTopicInput: React.FC<SessionTopicInputProps> = (props) => {
  const [hoverRef, isHovered] = useHover();

  const resolveResult = useManagedItemValue<ManagedConsumerSessionTopic>(props.value);

  if (resolveResult.type !== 'success') {
    return <UseManagedItemValueSpinner item={props.value} result={resolveResult} />
  }

  const item = resolveResult.value;
  const itemSpec = item.spec;

  const onSpecChange = (spec: ManagedMessageFilterChainSpec) => {
    const newValue: ManagedMessageFilterChainValOrRef = { ...props.value, val: { ...item, spec } };
    props.onChange(newValue);
  };

  const onConvertToValue = () => {
    const newValue: ManagedMessageFilterChainValOrRef = { type: 'value', val: item };
    props.onChange(newValue);
  };



  return (
    <div className={s.SessionTopicInput}>
      <FormItem>
        <TopicSelectorInput
          value={props.value.topicSelector}
          onChange={(v) => onSpecChange({ ...itemSpec, topicsSelectors: v })}
          libraryContext={props.libraryContext}
        />
      </FormItem>

      <FormItem>
      <FilterChainEditor
            value={itemSpec.messageFilterChain}
            onChange={(v) => onSpecChange({ ...itemSpec, messageFilterChain: v })}
            libraryContext={props.libraryContext}
          />
      </FormItem>


      session topic input
    </div>
  );
}

export default SessionTopicInput;
