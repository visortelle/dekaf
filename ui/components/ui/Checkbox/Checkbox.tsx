import React from 'react'

import s from './Checkbox.module.css';

export type CheckboxProps = {
  value: boolean;
  onChange: (value: boolean) => void;
  size: 'small' | 'big'
}

const Checkbox: React.FC<CheckboxProps> = (props) => {

  const { size } = props

  return (
    <input
      className={`${
        s.Checkbox,
        size === 'small' && s.SmallCheckbox,
        size === 'big' && s.BigCheckbox
      }`}
      onChange={() => props.onChange(!props.value)}
      type="checkbox"
      checked={props.value}
    />
  )
}

export default Checkbox;
