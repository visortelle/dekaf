import React from 'react'
import s from './SelectInput.module.css';
import SvgIcon from '../../SvgIcon/SvgIcon';
import arrowDownIcon from '!!raw-loader!./arrow-down.svg';

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
}

function Input<V extends { toString: () => string }>(props: InputProps<V>): React.ReactElement {
  return (
    <div className={s.Container}>
      {typeof props.value === 'undefined' && <div className={s.Placeholder}>{props.placeholder}</div>}
      <select
        className={s.Select}
        onChange={(e) => props.onChange((e.target.value as unknown as V) || undefined)}
        value={props.value?.toString()}
        disabled={props.disabled}
      >
        {props.list.map(item => {
          if (typeof item === 'undefined') {
            return <option key={'undefined'} value={undefined}></option>
          }

          return <option key={item.value.toString()} value={item.value.toString()}>{item.title}</option>
        })}
      </select>
      <div className={s.Arrow}>
        <SvgIcon svg={arrowDownIcon} />
      </div>
    </div>
  )
}

export default Input
