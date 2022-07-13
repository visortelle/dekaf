import React from 'react'
import s from './SelectInput.module.css';
import SvgIcon from '../../SvgIcon/SvgIcon';
import arrowDownIcon from '!!raw-loader!./arrow-down.svg';
import stringify from 'safe-stable-stringify';

export type ListItem<V> = {
  value: V,
  title: string
} | undefined;

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
          if (typeof item === 'undefined') {
            return <option key={'undefined'} value={undefined}></option>
          }

          const valueKey = props.getValueKey === undefined ? item.value.toString() : props.getValueKey(item.value);
          return <option key={valueKey} value={valueKey}>{item.title}</option>
        })}
      </select>
      <div className={`${s.Arrow} ${props.disabled ? s.DisabledArrow : ''}`}>
        <SvgIcon svg={arrowDownIcon} />
      </div>
    </div>
  )
}

export default Input;
