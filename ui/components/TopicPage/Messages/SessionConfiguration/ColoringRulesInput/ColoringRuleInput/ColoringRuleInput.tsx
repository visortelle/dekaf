import React from 'react';
import s from './ColoringRuleInput.module.css'
import ColorPickerButton from './ColorPickerButton/ColorPickerButton';
import { ManagedColoringRule, ManagedColoringRuleSpec, ManagedColoringRuleValOrRef } from '../../../../../ui/LibraryBrowser/model/user-managed-items';
import { useHover } from '../../../../../app/hooks/use-hover';
import { UseManagedItemValueSpinner, useManagedItemValue } from '../../../../../ui/LibraryBrowser/useManagedItemValue';
import { colorsByName } from './ColorPickerButton/ColorPicker/color-palette';
import Toggle from '../../../../../ui/Toggle/Toggle';
import { LibraryContext } from '../../../../../ui/LibraryBrowser/model/library-context';
import FilterChainEditor from '../../FilterChainEditor/FilterChainEditor';
import LibraryBrowserPanel from '../../../../../ui/LibraryBrowser/LibraryBrowserPanel/LibraryBrowserPanel';

export type ColoringRuleInputProps = {
  value: ManagedColoringRuleValOrRef,
  onChange: (value: ManagedColoringRuleValOrRef) => void,
  libraryContext: LibraryContext
  appearance?: 'default' | 'compact';
};

const ColoringRuleInput: React.FC<ColoringRuleInputProps> = (props) => {
  const [hoverRef, isHovered] = useHover();

  const resolveResult = useManagedItemValue<ManagedColoringRule>(props.value);

  if (resolveResult.type !== 'success') {
    return <UseManagedItemValueSpinner item={props.value} result={resolveResult} />
  }

  const item = resolveResult.value;
  const itemSpec = item.spec;

  const onSpecChange = (spec: ManagedColoringRuleSpec) => {
    const newValue: ManagedColoringRuleValOrRef = { ...props.value, val: { ...item, spec } };
    props.onChange(newValue);
  };

  const onConvertToValue = () => {
    const newValue: ManagedColoringRuleValOrRef = { type: 'value', val: item };
    props.onChange(newValue);
  };

  const cssFilter = itemSpec.isEnabled ? undefined : 'grayscale(0.5) opacity(0.75)';

  return (
    <div className={s.ColoringRuleInput} style={{ filter: cssFilter }}>
      {props.appearance !== 'compact' && (
        <div ref={hoverRef}>
          <LibraryBrowserPanel
            itemType='coloring-rule'
            itemToSave={item}
            onPick={(item) => props.onChange({
              type: 'reference',
              ref: item.metadata.id,
              val: item as ManagedColoringRule
            })}
            onSave={(item) => props.onChange({
              type: 'reference',
              ref: item.metadata.id,
              val: item as ManagedColoringRule
            })}
            isForceShowButtons={isHovered}
            libraryContext={props.libraryContext}
            managedItemReference={props.value.type === 'reference' ? { id: props.value.ref, onConvertToValue } : undefined}
          />
        </div>
      )}

      <div className={s.TopRow}>
        <Toggle
          value={itemSpec.isEnabled}
          onChange={(v) => onSpecChange({ ...itemSpec, isEnabled: v })}
          label="Enabled"
        />

        <div className={s.Colors}>
          <div className={s.ColorPicker}>
            <ColorPickerButton
              value={itemSpec.foregroundColor}
              onChange={(v) => onSpecChange({ ...itemSpec, foregroundColor: v })}
              width='inherit'
              height='inherit'
              title={<>Foreground Color ({itemSpec.foregroundColor})</>}
            />
          </div>

          <div className={s.ColorPicker}>
            <ColorPickerButton
              value={itemSpec.backgroundColor}
              onChange={(v) => onSpecChange({ ...itemSpec, backgroundColor: v })}
              width='inherit'
              height='inherit'
              title={<>Background Color ({itemSpec.backgroundColor})</>}
            />
          </div>

          <div
            className={s.ColorsPreview}
            style={{
              color: colorsByName[itemSpec.foregroundColor],
              background: colorsByName[itemSpec.backgroundColor]
            }}
          >
            Preview
          </div>
        </div>
      </div>

      {props.appearance !== 'compact' && (
        <div>
          <FilterChainEditor
            value={itemSpec.messageFilterChain}
            onChange={(v) => onSpecChange({ ...itemSpec, messageFilterChain: v })}
            libraryContext={props.libraryContext}
          />
        </div>
      )}
    </div>
  );
}

export default ColoringRuleInput;
