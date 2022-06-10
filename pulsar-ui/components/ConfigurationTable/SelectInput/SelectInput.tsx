import React from 'react'
import s from './SelectInput.module.css';
import SvgIcon from '../../ui/SvgIcon/SvgIcon';
import arrowDownIcon from '!!raw-loader!./arrow-down.svg';

type Id = string;

export type ListItem = {
  id: Id,
  title: string
} | undefined

export type List = ListItem[]

export type InputProps = {
  onChange: (id: Id | undefined) => void
  value: undefined | Id,
  list: List,
  placeholder?: string
}

const Input: React.FC<InputProps> = (props) => {
  return (
    <div className={s.Container}>
      {typeof props.value === 'undefined' && <div className={s.Placeholder}>{props.placeholder}</div>}
      <select
        className={s.Select}
        onChange={(e) => props.onChange(e.target.value || undefined)} value={props.value}
      >
        {props.list.map(item => {
          if (typeof item ==='undefined') {
            return <option key={'undefined'} value={undefined}></option>
          }

          return <option key={item.id} value={item.id}>{item.title}</option>
        })}
      </select>
      <div className={s.Arrow}>
        <SvgIcon svg={arrowDownIcon} />
      </div>
    </div>
  )
}

export default Input
