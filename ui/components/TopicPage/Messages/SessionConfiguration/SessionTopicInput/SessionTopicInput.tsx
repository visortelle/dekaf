import React from 'react';
import s from './SessionTopicInput.module.css'
import FormItem from '../../../../ui/ConfigurationTable/FormItem/FormItem';
import TopicSelectorInput from '../../topic-selector/TopicSelectorInput/TopicSelectorInput';
import { LibraryContext } from '../../../../ui/LibraryBrowser/model/library-context';
import FilterChainEditor from '../FilterChainEditor/FilterChainEditor';
import { useHover } from '../../../../app/hooks/use-hover';
import { UseManagedItemValueSpinner, useManagedItemValue } from '../../../../ui/LibraryBrowser/useManagedItemValue';
import { ManagedConsumerSessionTopic, ManagedConsumerSessionTopicSpec, ManagedConsumerSessionTopicValOrRef } from '../../../../ui/LibraryBrowser/model/user-managed-items';
import LibraryBrowserPanel from '../../../../ui/LibraryBrowser/LibraryBrowserPanel/LibraryBrowserPanel';

export type SessionTopicInputProps = {
  value: ManagedConsumerSessionTopicValOrRef;
  onChange: (v: ManagedConsumerSessionTopicValOrRef) => void;
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

  const onSpecChange = (spec: ManagedConsumerSessionTopicSpec) => {
    const newValue: ManagedConsumerSessionTopicValOrRef = { ...props.value, val: { ...item, spec } };
    props.onChange(newValue);
  };

  const onConvertToValue = () => {
    const newValue: ManagedConsumerSessionTopicValOrRef = { type: 'value', val: item };
    props.onChange(newValue);
  };

  return (
    <div className={s.SessionTopicInput} ref={hoverRef}>
      <LibraryBrowserPanel
        itemType='consumer-session-topic'
        itemToSave={item}
        onPick={(item) => props.onChange({
          type: 'reference',
          ref: item.metadata.id,
          val: item as ManagedConsumerSessionTopic
        })}
        onSave={(item) => props.onChange({
          type: 'reference',
          ref: item.metadata.id,
          val: item as ManagedConsumerSessionTopic
        })}
        isForceShowButtons={isHovered}
        libraryContext={props.libraryContext}
        managedItemReference={props.value.type === 'reference' ? { id: props.value.ref, onConvertToValue } : undefined}
      />

      <FormItem>
        <TopicSelectorInput
          value={itemSpec.topicSelector}
          onChange={(v) => onSpecChange({ ...itemSpec, topicSelector: v })}
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

      <FormItem>
        Coloring rules chain editor should be here
      </FormItem>
    </div>
  );
}

export default SessionTopicInput;
