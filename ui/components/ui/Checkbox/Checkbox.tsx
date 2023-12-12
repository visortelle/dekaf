import React, { InputHTMLAttributes } from 'react'

import s from './Checkbox.module.css';
import checkedIcon from './checked.svg';
import uncheckedIcon from './unchecked.svg';

export type CheckboxProps = {
  onChange: (value: boolean) => void;
  isInline?: boolean;
  isReadOnly?: boolean;
} & Omit<InputHTMLAttributes<any>, 'onChange' | 'value'>;

const Checkbox: React.FC<CheckboxProps> = (props) => {
  const {
    checked,
    style,
    className,
    onChange,
    isInline,
    isReadOnly,
    ...restProps
  } = props;

  return (
    <label
      className={`
        ${s.Checkbox}
        ${props.isReadOnly ? s.ReadOnly : ''}
        ${props.checked ? s.Checked : s.Unchecked}
        ${isInline ? s.InlineCheckbox : ''}
        ${className || ''}
      `}
      style={style}
    >
      <input
        className={`${s.CheckboxInput}`}
        onChange={() => {
          if (props.isReadOnly) {
            return;
          }

          onChange(!props.checked);
        }}
        type="checkbox"
        checked={props.checked}
        {...restProps}
      />

      <div
        className={`${s.CheckboxIcon}`}
        dangerouslySetInnerHTML={{ __html: props.checked ? checkedIcon : uncheckedIcon }}
      />
    </label>
  );
}

export default Checkbox;
