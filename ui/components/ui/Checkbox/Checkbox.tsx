import React from 'react'

import s from './Checkbox.module.css';
import checkedIcon from './checked.svg';
import uncheckedIcon from './unchecked.svg';

export type CheckboxProps = {
  value: boolean;
  onChange: (value: boolean) => void;
}

const Checkbox: React.FC<CheckboxProps> = (props) => {
  return (
    <label className={`${s.Checkbox} ${props.value ? s.Checked : s.Unchecked}`}>
      <input
        className={`${s.CheckboxInput}`}
        onChange={() => props.onChange(!props.value)}
        type="checkbox"
        checked={props.value}
      />

      <div
        className={`${s.CheckboxIcon}`}
        dangerouslySetInnerHTML={{ __html: props.value ? checkedIcon : uncheckedIcon }}
      />
    </label>
  );
}

export default Checkbox;
