import React from 'react'
import s from './Select.module.css';
import SvgIcon from '../SvgIcon/SvgIcon';
import arrowDownIcon from './arrow-down.svg';

export type ListItem<V> = {
  type: 'item',
  value: V,
  title: string
} | { type: 'group', title: string, items: ListItem<V>[] } | { type: 'empty', title: string };

export type List<V> = ListItem<V>[]

export type SelectProps<V> = {
  value: string;
  onChange: (value: V) => void;
  list: List<V>;
  placeholder?: string;
  disabled?: boolean;
}

function Select<V extends string>(props: SelectProps<V>): React.ReactElement {
  function renderRegularItem(item: ListItem<V>) {
    if (item.type !== 'item') {
      return <></>
    }

    const valueKey = item.value.toString();
    return <option key={valueKey} value={valueKey}>{item.title}</option>
  }

  return (
    <div className={s.Container}>
      {props.value === undefined && <div className={s.Placeholder}>{props.placeholder}</div>}
      <select
        className={`${s.Select} ${props.disabled ? s.DisabledSelect : ''}`}
        onChange={(v) => props.onChange(v.target.value as V)}
        value={props.value}
        disabled={props.disabled}
      >
        {props.list.map(item => {
          if (item.type === 'empty') {
            return <option key={`select-empty-value-f5da5543-e672-4d1f-bc66-28d04ea17354`} value={undefined}></option>
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

export default Select;
