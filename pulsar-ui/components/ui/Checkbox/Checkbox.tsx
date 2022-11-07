import React from 'react'

import s from './Checkbox.module.css';

export type CheckboxProps = {
  checked: boolean;
  onChange: (value: boolean) => void;
}

function Checkbox(props: CheckboxProps) {

  return (
    <div className={s.Container}>
      <input
        onChange={(v) => props.onChange(v.target.checked)}
        id="isGlobal" type="checkbox"
      /> 
    </div>
  )
}

export default Checkbox;
