import React from 'react'
import s from './SelectInput.module.css';
import { nanoid } from 'nanoid';
import SvgIcon from '../../ui/SvgIcon/SvgIcon';
import arrowDownIcon from '!!raw-loader!./arrow-down.svg';

export type ListItem = {
  id: string
  title: string
}

export type List = ListItem[]

export const undefinedListItem = 'undefined-list-item' + nanoid();

export type InputProps = {
  onChange: (id: string) => void
  value: ListItem['id'],
  list: List,
  placeholder?: string,
  prependWithEmptyItem?: boolean
}

const Input: React.FC<InputProps> = (props) => {

  return (
    <div className={s.Container}>
      {props.value === undefinedListItem && <div className={s.Placeholder}>{props.placeholder}</div>}
      <select
        className={s.Select}
        onChange={(e) => props.onChange(e.target.value)} value={props.value}
      >
        {props.prependWithEmptyItem && <option key={undefinedListItem} value={undefinedListItem}></option>}
        {props.list.map(item => {
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
