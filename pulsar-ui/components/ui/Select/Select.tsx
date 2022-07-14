import React from 'react'
import s from './Select.module.css';
import SvgIcon from '../SvgIcon/SvgIcon';
import arrowDownIcon from '!!raw-loader!./arrow-down.svg';
import { nanoid } from 'nanoid';

export type ListItem = {
  type: 'item',
  value: string,
  title: string
} | { type: 'group', title: string, items: ListItem[] } | { type: 'empty', title: string };

export type List = ListItem[]

export type InputProps = {
  value: string;
  onChange: (value: string) => void;
  list: List;
  placeholder?: string;
  disabled?: boolean;
}

function Input(props: InputProps): React.ReactElement {
  function renderRegularItem(item: ListItem) {
    if (item.type !== 'item') {
      return <></>
    }

    const valueKey = item.value.toString();
    return <option key={valueKey} value={valueKey}>{item.title}</option>
  }

  return (
    <div className={s.Container}>
      {typeof props.value === 'undefined' && <div className={s.Placeholder}>{props.placeholder}</div>}
      <select
        className={`${s.Select} ${props.disabled ? s.DisabledSelect : ''}`}
        onChange={(v) => props.onChange(v.target.value)}
        value={props.value}
        disabled={props.disabled}
      >
        {props.list.map(item => {
          if (item.type === 'empty') {
            return <option key={nanoid()} value={undefined}></option>
          }

          if (item.type === 'item') {
            return renderRegularItem(item);
          }

          if (item.type === 'group') {
            return <optgroup key={item.title} label={item.title}>{item.items.map(renderRegularItem)}</optgroup>
          }
        })}
      </select>
      <div className={`${s.Arrow} ${props.disabled ? s.DisabledArrow : ''}`}>
        <SvgIcon svg={arrowDownIcon} />
      </div>
    </div>
  )
}

export default Input;
