import React from 'react'

import s from './Checkbox.module.css';

export type CheckboxProps<V> = {
  value: string;
  onChange: (value: V) => void;
}

function Checkbox(props: CheckboxProps<V>) {

  return (
    <div className={s.Container}>
      <input
        onChange={(v) => props.onChange(v.target.checked as V)}
        id="isGlobal" type="checkbox"
      /> 
    </div>
  )
}

export default Checkbox;
