import React from 'react'

import s from './Checkbox.module.css';

export type CheckboxProps = {
  title: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

function Checkbox(props: CheckboxProps) {

  return (
    <div className={s.Container}>
      <span>{props.title}</span>
      <input
        className={s.Input}
        onChange={(v) => props.onChange(v.target.checked)}
        type="checkbox"
      /> 
    </div>
  )
}

export default Checkbox;
