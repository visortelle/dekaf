import React from 'react';
import s from './OneOfField.module.css'
import { ConfigurationField, ListValue } from "../values";

export type OneOfFieldProps = {

};

const OneOfField: React.FC<OneOfFieldProps> = (props) => {
  return (
    <div className={s.OneOfField}></div>
  );
}

export default OneOfField;
