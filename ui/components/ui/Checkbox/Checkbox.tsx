import React from 'react'

import s from './Checkbox.module.css';

export type CheckboxProps = {
  value: boolean;
  onChange: (value: boolean) => void;
}

const Checkbox: React.FC<CheckboxProps> = (props) => {

  return (
    <label className={`${s.CheckboxContainer}`}>
      <input
        className={`${s.Checkbox}`}
        onChange={() => props.onChange(!props.value)}
        type="checkbox"
        checked={props.value}
      />
      {props.value ?
        <svg className={`${s.CustomCheckbox}`} fill="#276ff4" focusable="false" aria-hidden="true" viewBox="0 0 24 24" data-testid="CheckBoxIcon">
          <path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2zm-9 14-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg> :
        <svg className={`${s.CustomCheckbox}`} fill="#276ff4" focusable="false" aria-hidden="true" viewBox="0 0 24 24" data-testid="CheckBoxOutlineBlankIcon">
          <path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
        </svg>
      }
    </label>
  )
}

export default Checkbox;
