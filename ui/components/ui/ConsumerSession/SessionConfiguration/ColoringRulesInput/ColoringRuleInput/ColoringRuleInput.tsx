import React, { useEffect } from 'react';
import s from './ColoringRuleInput.module.css'
import ColorPickerButton from './ColorPickerButton/ColorPickerButton';
import { ManagedColoringRule, ManagedColoringRuleSpec, ManagedColoringRuleValOrRef } from '../../../../LibraryBrowser/model/user-managed-items';
import { useHover } from '../../../../../app/hooks/use-hover';
import { UseManagedItemValueSpinner, useManagedItemValue } from '../../../../LibraryBrowser/useManagedItemValue';
import { colorsByName } from './ColorPickerButton/ColorPicker/color-palette';
import { LibraryContext } from '../../../../LibraryBrowser/model/library-context';
import FilterChainEditor from '../../FilterChainEditor/FilterChainEditor';
import LibraryBrowserPanel, { LibraryBrowserPanelProps } from '../../../../LibraryBrowser/LibraryBrowserPanel/LibraryBrowserPanel';
import OnOffToggle from '../../../../IconToggle/OnOffToggle/OnOffToggle';

export type ColoringRuleInputProps = {
  value: ManagedColoringRuleValOrRef,
  onChange: (value: ManagedColoringRuleValOrRef) => void,
  libraryContext: LibraryContext
  appearance?: 'default' | 'compact';
  isReadOnly?: boolean;
  libraryBrowserPanel?: Partial<LibraryBrowserPanelProps>;
};

const ColoringRuleInput: React.FC<ColoringRuleInputProps> = (props) => {
  const [hoverRef, isHovered] = useHover();

  const resolveResult = useManagedItemValue<ManagedColoringRule>(props.value);

  useEffect(() => {
    if (props.value.val === undefined && resolveResult.type === 'success') {
      props.onChange({ ...props.value, val: resolveResult.value });
    }
  }, [resolveResult]);

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
            value={item}
            onPick={(item) => props.onChange({
              type: 'value',
              val: item as ManagedColoringRule
            })}
            onSave={(item) => props.onChange({
              type: 'value',
              val: item as ManagedColoringRule
            })}
            onChange={(item) => {
              props.onChange({
                ...props.value,
                val: item as ManagedColoringRule
              });
            }}
            isForceShowButtons={isHovered}
            libraryContext={props.libraryContext}
            managedItemReference={props.value.type === 'reference' ? { id: props.value.ref, onConvertToValue } : undefined}
            isReadOnly={props.isReadOnly}
            {...props.libraryBrowserPanel}
          />
        </div>
      )}

      <div className={s.TopRow} style={{ marginBottom: props.appearance === 'compact' ? '0' : '24rem' }}>
        <OnOffToggle
          value={itemSpec.isEnabled}
          onChange={(v) => onSpecChange({ ...itemSpec, isEnabled: v })}
          isReadOnly={props.isReadOnly}
        />

        <div className={s.Colors}>
          <div className={s.ColorPicker}>
            <ColorPickerButton
              value={itemSpec.foregroundColor}
              onChange={(v) => onSpecChange({ ...itemSpec, foregroundColor: v })}
              width='inherit'
              height='inherit'
              title={<>Foreground Color: {itemSpec.foregroundColor}</>}
              isReadOnly={props.isReadOnly}
            />
          </div>

          <div className={s.ColorPicker}>
            <ColorPickerButton
              value={itemSpec.backgroundColor}
              onChange={(v) => onSpecChange({ ...itemSpec, backgroundColor: v })}
              width='inherit'
              height='inherit'
              title={<>Background Color: {itemSpec.backgroundColor}</>}
              isReadOnly={props.isReadOnly}
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
            isReadOnly={props.isReadOnly}
          />
        </div>
      )}
    </div>
  );
}

export default ColoringRuleInput;
