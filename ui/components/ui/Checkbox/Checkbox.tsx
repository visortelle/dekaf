import React from 'react'

import s from './Checkbox.module.css';

export type CheckboxProps = {
  value: boolean;
  onChange: (value: boolean) => void;
}

const Checkbox: React.FC<CheckboxProps> = (props) => {

  return (
    <input
      onChange={() => props.onChange(!props.value)}
      type="checkbox"
      checked={props.value}
    />
  )
}

export default Checkbox;
