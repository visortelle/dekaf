import React from 'react'
import s from './SelectInput.module.css';
import SvgIcon from '../../SvgIcon/SvgIcon';
import arrowDownIcon from '!!raw-loader!./arrow-down.svg';
import { nanoid } from 'nanoid';

export type ListItem<V> = {
  type: 'item',
  value: V,
  title: string
} | { type: 'group', title: string, items: ListItem<V>[] } | { type: 'empty', title: string };

export type List<V> = ListItem<V>[]

export type InputProps<V> = {
  value: V;
  onChange: (value: V) => void;
  list: List<V>;
  placeholder?: string;
  disabled?: boolean;
  getValueKey?: (value: V) => string;
}

function Input<V extends { toString: () => string }>(props: InputProps<V>): React.ReactElement {
  function renderRegularItem(item: ListItem<V>) {
    if (item.type !== 'item') {
      return <></>
    }

    const valueKey = props.getValueKey === undefined ? item.value.toString() : props.getValueKey(item.value);
    return <option key={valueKey} value={valueKey}>{item.title}</option>
  }

  return (
    <div className={s.Container}>
      {typeof props.value === 'undefined' && <div className={s.Placeholder}>{props.placeholder}</div>}
      <select
        className={`${s.Select} ${props.disabled ? s.DisabledSelect : ''}`}
        onChange={(e) => props.onChange((e.target.value as unknown as V) || undefined)}
        value={props.getValueKey === undefined ? props?.value?.toString() : props.getValueKey(props.value)}
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
