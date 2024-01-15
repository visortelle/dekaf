import React from 'react';
import s from './FormItem.module.css'

export type FormItemProps = {
  children: React.ReactNode,
  size?: 'regular' | 'small'
};

const FormItem: React.FC<FormItemProps> = (props) => {
  return (
    <div
      className={`
        ${s.FormItem}
        ${props.size === 'small' ? s.Small : ''}
      `}
    >
      {props.children}
    </div>
  );
}

export default FormItem;
