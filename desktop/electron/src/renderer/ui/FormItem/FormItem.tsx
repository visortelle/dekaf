import React from 'react';
import s from './FormItem.module.css'

export type FormItemProps = {
  children: React.ReactNode;
};

const FormItem: React.FC<FormItemProps> = (props) => {
  return (
    <div className={s.FormItem}>
      {props.children}
    </div>
  );
}

export default FormItem;
