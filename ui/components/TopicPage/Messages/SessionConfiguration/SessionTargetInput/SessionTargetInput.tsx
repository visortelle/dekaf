import React from 'react';
import s from './SessionTargetInput.module.css'
import TopicSelectorInput from '../../topic-selector/TopicSelectorInput/TopicSelectorInput';
import { LibraryContext } from '../../../../ui/LibraryBrowser/model/library-context';
import FilterChainEditor from '../FilterChainEditor/FilterChainEditor';
import { useHover } from '../../../../app/hooks/use-hover';
import { UseManagedItemValueSpinner, useManagedItemValue } from '../../../../ui/LibraryBrowser/useManagedItemValue';
import { ManagedConsumerSessionTarget, ManagedConsumerSessionTargetSpec, ManagedConsumerSessionTargetValOrRef } from '../../../../ui/LibraryBrowser/model/user-managed-items';
import LibraryBrowserPanel, { LibraryBrowserPanelProps } from '../../../../ui/LibraryBrowser/LibraryBrowserPanel/LibraryBrowserPanel';
import ColoringRuleChainInput from '../ColoringRulesInput/ColoringRuleChainInput';

export type SessionTargetInputProps = {
  value: ManagedConsumerSessionTargetValOrRef,
  onChange: (v: ManagedConsumerSessionTargetValOrRef) => void,
  libraryContext: LibraryContext,
  isReadOnly?: boolean,
  targetIndex?: number,
  libraryBrowserPanel?: Partial<LibraryBrowserPanelProps>
};

const SessionTargetInput: React.FC<SessionTargetInputProps> = (props) => {
  const [hoverRef, isHovered] = useHover();

  const resolveResult = useManagedItemValue<ManagedConsumerSessionTarget>(props.value);

  if (resolveResult.type !== 'success') {
    return <UseManagedItemValueSpinner item={props.value} result={resolveResult} />
  }

  const item = resolveResult.value;
  const itemSpec = item.spec;

  const onSpecChange = (spec: ManagedConsumerSessionTargetSpec) => {
    const newValue: ManagedConsumerSessionTargetValOrRef = { ...props.value, val: { ...item, spec } };
    props.onChange(newValue);
  };

  const onConvertToValue = () => {
    const newValue: ManagedConsumerSessionTargetValOrRef = { type: 'value', val: item };
    props.onChange(newValue);
  };

  return (
    <div className={s.SessionTargetInput}>
      {props.targetIndex !== undefined && <div className={s.TargetIndex}>Target {props.targetIndex + 1}</div>}
      <div ref={hoverRef}>
        <LibraryBrowserPanel
          itemType='consumer-session-target'
          value={item}
          onPick={(item) => props.onChange({
            type: 'reference',
            ref: item.metadata.id,
            val: item as ManagedConsumerSessionTarget
          })}
          onSave={(item) => props.onChange({
            type: 'reference',
            ref: item.metadata.id,
            val: item as ManagedConsumerSessionTarget
          })}
          onChange={(item) => {
            props.onChange({
              ...props.value,
              val: item as ManagedConsumerSessionTarget
            });
          }}
          isForceShowButtons={isHovered}
          libraryContext={props.libraryContext}
          managedItemReference={props.value.type === 'reference' ? { id: props.value.ref, onConvertToValue } : undefined}
          isReadOnly={props.isReadOnly}
          {...props.libraryBrowserPanel}
        />
      </div>

      <TopicSelectorInput
        value={itemSpec.topicSelector}
        onChange={(v) => onSpecChange({ ...itemSpec, topicSelector: v })}
        libraryContext={props.libraryContext}
        isReadOnly={props.isReadOnly}
      />

      <FilterChainEditor
        value={itemSpec.messageFilterChain}
        onChange={(v) => onSpecChange({ ...itemSpec, messageFilterChain: v })}
        libraryContext={props.libraryContext}
        isReadOnly={props.isReadOnly}
      />

      <ColoringRuleChainInput
        value={itemSpec.coloringRuleChain}
        onChange={(v) => onSpecChange({ ...itemSpec, coloringRuleChain: v })}
        libraryContext={props.libraryContext}
        isReadOnly={props.isReadOnly}
      />
    </div>
  );
}

export default SessionTargetInput;
