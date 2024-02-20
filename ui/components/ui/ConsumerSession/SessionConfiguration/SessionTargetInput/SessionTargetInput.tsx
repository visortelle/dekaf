import React from 'react';
import s from './SessionTargetInput.module.css'
import TopicSelectorInput from '../../topic-selector/TopicSelectorInput/TopicSelectorInput';
import { LibraryContext } from '../../../LibraryBrowser/model/library-context';
import FilterChainEditor from '../FilterChainEditor/FilterChainEditor';
import { useHover } from '../../../../app/hooks/use-hover';
import { UseManagedItemValueSpinner, useManagedItemValue } from '../../../LibraryBrowser/useManagedItemValue';
import { ManagedConsumerSessionTarget, ManagedConsumerSessionTargetSpec, ManagedConsumerSessionTargetValOrRef } from '../../../LibraryBrowser/model/user-managed-items';
import LibraryBrowserPanel, { LibraryBrowserPanelProps } from '../../../LibraryBrowser/LibraryBrowserPanel/LibraryBrowserPanel';
import ColoringRuleChainInput from '../ColoringRulesInput/ColoringRuleChainInput';
import ValueProjectionListInput from '../../value-projections/ValueProjectionListInput/ValueProjectionListInput';
import OnOffToggle from '../../../IconToggle/OnOffToggle/OnOffToggle';
import { cloneDeep } from 'lodash';
import IconToggle from '../../../IconToggle/IconToggle';
import FormItem from '../../../ConfigurationTable/FormItem/FormItem';
import A from '../../../A/A';
import DeserializerInput from './DeserializerInput/DeserializerInput';

const readCompactedHelp = (
  <div>
    <p>Read compacted topic</p>
    <p>
      Pulsar's topic compaction feature enables you to create compacted topics in which older, "obscured" entries are pruned from the topic, allowing for faster reads through the topic's history (which messages are deemed obscured/outdated/irrelevant will depend on your use case).
    </p>
    <A href="https://pulsar.apache.org/docs/next/cookbooks-compaction/" isExternalLink>Learn more</A>
  </div>
)

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

  const cssFilter = itemSpec.isEnabled ? undefined : 'grayscale(0.5) opacity(0.75)';

  return (
    <div className={s.SessionTargetInput} style={{ filter: cssFilter }}>
      {props.targetIndex !== undefined && <div className={s.TargetIndex}>Target {props.targetIndex + 1}</div>}
      <div ref={hoverRef}>
        <LibraryBrowserPanel
          itemType='consumer-session-target'
          value={item}
          onPick={(item) => props.onChange({
            type: 'value',
            val: item as ManagedConsumerSessionTarget
          })}
          onSave={(item) => props.onChange({
            type: 'value',
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
          extraElements={{
            preItemType: (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4rem' }}>
                <OnOffToggle
                  value={itemSpec.isEnabled}
                  onChange={v => onSpecChange({ ...itemSpec, isEnabled: v })}
                  isReadOnly={props.isReadOnly}
                />
              </div>
            )
          }}
          isReadOnly={props.isReadOnly}
          {...props.libraryBrowserPanel}
        />
      </div>

      <div style={{ marginTop: '-28rem' }}>
        <FormItem>
          <IconToggle<boolean>
            items={[
              { type: 'item', value: true, help: readCompactedHelp, foregroundColor: '#fff', backgroundColor: 'var(--accent-color-blue)', label: 'Compacted' },
              { type: 'item', value: false, help: readCompactedHelp, foregroundColor: 'var(--background-color)', backgroundColor: '#aaa', label: 'Compacted' }
            ]}
            value={itemSpec.consumptionMode.mode.type === 'read-compacted-consumption-mode'}
            onChange={(v) => {
              const newItemSpec = cloneDeep(itemSpec);
              newItemSpec.consumptionMode.mode = v ? { type: 'read-compacted-consumption-mode' } : { type: 'regular-consumption-mode' };
              onSpecChange(newItemSpec);
            }}
            isReadOnly={props.isReadOnly}
            isWithShadow
          />
        </FormItem>
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

      <ValueProjectionListInput
        value={itemSpec.valueProjectionList}
        onChange={(v) => onSpecChange({ ...itemSpec, valueProjectionList: v })}
        libraryContext={props.libraryContext}
        isReadOnly={props.isReadOnly}
      />

      <ColoringRuleChainInput
        value={itemSpec.coloringRuleChain}
        onChange={(v) => onSpecChange({ ...itemSpec, coloringRuleChain: v })}
        libraryContext={props.libraryContext}
        isReadOnly={props.isReadOnly}
      />

      <DeserializerInput
        value={itemSpec.messageValueDeserializer}
        onChange={(v) => onSpecChange({ ...itemSpec, messageValueDeserializer: v })}
        libraryContext={props.libraryContext}
        isReadOnly={props.isReadOnly}
      />
    </div>
  );
}

export default SessionTargetInput;
