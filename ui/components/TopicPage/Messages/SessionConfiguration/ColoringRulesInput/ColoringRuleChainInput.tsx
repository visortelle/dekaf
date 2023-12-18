import React from 'react';
import s from './ColoringRuleChainInput.module.css'
import ColoringRuleInput from './ColoringRuleInput/ColoringRuleInput';
import { ManagedColoringRuleChain, ManagedColoringRuleChainSpec, ManagedColoringRuleChainValOrRef, ManagedColoringRuleValOrRef } from '../../../../ui/LibraryBrowser/model/user-managed-items';
import { useHover } from '../../../../app/hooks/use-hover';
import { UseManagedItemValueSpinner, useManagedItemValue } from '../../../../ui/LibraryBrowser/useManagedItemValue';
import ListInput from '../../../../ui/ConfigurationTable/ListInput/ListInput';
import { v4 as uuid } from 'uuid';
import { themeBackgroundColorName, themeForegroundColorName } from './ColoringRuleInput/ColorPickerButton/ColorPicker/color-palette';
import LibraryBrowserPanel from '../../../../ui/LibraryBrowser/LibraryBrowserPanel/LibraryBrowserPanel';
import { LibraryContext } from '../../../../ui/LibraryBrowser/model/library-context';
import Toggle from '../../../../ui/Toggle/Toggle';
import OnOffToggle from '../../../../ui/IconToggle/OnOffToggle/OnOffToggle';

export type ColoringRuleChainInputProps = {
  value: ManagedColoringRuleChainValOrRef,
  onChange: (value: ManagedColoringRuleChainValOrRef) => void,
  libraryContext: LibraryContext,
};

const ColoringRuleChainInput: React.FC<ColoringRuleChainInputProps> = (props) => {
  const [hoverRef, isHovered] = useHover();

  const resolveResult = useManagedItemValue<ManagedColoringRuleChain>(props.value);

  if (resolveResult.type !== 'success') {
    return <UseManagedItemValueSpinner item={props.value} result={resolveResult} />
  }

  const item = resolveResult.value;
  const itemSpec = item.spec;

  const onSpecChange = (spec: ManagedColoringRuleChainSpec) => {
    const newValue: ManagedColoringRuleChainValOrRef = { ...props.value, val: { ...item, spec } };
    props.onChange(newValue);
  };

  const onConvertToValue = () => {
    const newValue: ManagedColoringRuleChainValOrRef = { type: 'value', val: item };
    props.onChange(newValue);
  };

  const cssFilter = itemSpec.isEnabled ? undefined : 'grayscale(0.5) opacity(0.75)';

  return (
    <div className={s.ColoringRuleChainInput} style={{ filter: cssFilter }}>
      <div ref={hoverRef} style={{ marginBottom: '8rem' }}>
        <LibraryBrowserPanel
          itemType='coloring-rule-chain'
          value={item}
          onPick={(item) => props.onChange({
            type: 'reference',
            ref: item.metadata.id,
            val: item as ManagedColoringRuleChain
          })}
          onSave={(item) => props.onChange({
            type: 'reference',
            ref: item.metadata.id,
            val: item as ManagedColoringRuleChain
          })}
          onChange={(item) => {
            props.onChange({
              ...props.value,
              val: item as ManagedColoringRuleChain
            });
          }}
          isForceShowButtons={isHovered}
          libraryContext={props.libraryContext}
          managedItemReference={props.value.type === 'reference' ? { id: props.value.ref, onConvertToValue } : undefined}
          extraElements={{
            preItemType: (
              <OnOffToggle
                value={itemSpec.isEnabled}
                onChange={(v) => onSpecChange({ ...itemSpec, isEnabled: v })}
              />
            )
          }}
        />
      </div>

      <ListInput<ManagedColoringRuleValOrRef>
        value={itemSpec.coloringRules}
        onChange={(v) => onSpecChange({ ...itemSpec, coloringRules: v })}
        getId={(item) => item.type === 'reference' ? item.ref : item.val.metadata.id}
        renderItem={(rule, i, { isCollapsed, isDraggingSomeItem }) => {
          return (
            <div className={`${s.ColoringRuleInput} ${(isCollapsed || isDraggingSomeItem) ? s.CollapsedColoringRuleInput : ''}`}>
              <ColoringRuleInput
                value={rule}
                onChange={(v) => {
                  const newRules = [...itemSpec.coloringRules];
                  newRules[i] = v;
                  onSpecChange({ ...itemSpec, coloringRules: newRules });
                }}
                libraryContext={props.libraryContext}
                appearance={(isCollapsed || isDraggingSomeItem) ? 'compact' : undefined}
              />
            </div>
          )
        }}
        itemName='Coloring Rule'
        onAdd={(v, { addUncollapsedItem }) => {
          const newRule: ManagedColoringRuleValOrRef = {
            type: 'value',
            val: {
              metadata: {
                id: uuid(),
                name: '',
                descriptionMarkdown: '',
                type: 'coloring-rule',
              },
              spec: {
                isEnabled: true,
                backgroundColor: themeBackgroundColorName,
                foregroundColor: themeForegroundColorName,
                messageFilterChain: {
                  type: 'value',
                  val: {
                    metadata: {
                      id: uuid(),
                      name: '',
                      descriptionMarkdown: '',
                      type: 'message-filter-chain',
                    },
                    spec: {
                      isEnabled: true,
                      isNegated: false,
                      filters: [],
                      mode: 'all'
                    }
                  }
                }
              }
            }
          };
          const newRules = itemSpec.coloringRules.concat([newRule]);
          onSpecChange({ ...itemSpec, coloringRules: newRules });
          addUncollapsedItem(newRule.val.metadata.id);
        }}
        onRemove={(id) => {
          const newRules = itemSpec.coloringRules.filter((rule) => rule.type === 'reference' ? rule.ref !== id : rule.val.metadata.id !== id);
          onSpecChange({ ...itemSpec, coloringRules: newRules });
        }}
        isHideNothingToShow
        isContentDoesntOverlapRemoveButton
        isHasCollapsedRenderer
      />
    </div>
  );
}

export default ColoringRuleChainInput;
