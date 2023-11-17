import React from 'react';
import s from './ColoringRuleInput.module.css'
import ColorPickerButton from './ColorPickerButton/ColorPickerButton';
import { ManagedColoringRule, ManagedColoringRuleSpec, ManagedColoringRuleValOrRef } from '../../../../../ui/LibraryBrowser/model/user-managed-items';
import { useHover } from '../../../../../app/hooks/use-hover';
import { UseManagedItemValueSpinner, useManagedItemValue } from '../../../../../ui/LibraryBrowser/useManagedItemValue';
import { colorsByName } from './ColorPicker/color-palette';

export type ColoringRuleInputProps = {
  value: ManagedColoringRuleValOrRef,
  onChange: (value: ManagedColoringRuleValOrRef) => void,
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

  return (
    <div className={s.ColoringRuleInput} ref={hoverRef}>
      <div className={s.Colors}>
        <div className={s.ColorPicker}>
          <ColorPickerButton
            value={itemSpec.foregroundColor}
            onChange={(v) => onSpecChange({ ...itemSpec, foregroundColor: v })}
            width='inherit'
            height='inherit'
            title={<>Foreground Color</>}
          />
        </div>

        <div className={s.ColorPicker}>
          <ColorPickerButton
            value={itemSpec.backgroundColor}
            onChange={(v) => onSpecChange({ ...itemSpec, backgroundColor: v })}
            width='inherit'
            height='inherit'
            title={<>Background Color</>}
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
  );
}

export default ColoringRuleInput;
