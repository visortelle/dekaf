import React from 'react';
import s from './ConfigurationTable.module.css'

export type ConfigurationField = {
  id: string;
  title: string;
  description: React.ReactElement;
  input: React.ReactElement;
  isRequired?: boolean;
};

export type ConfigurationTableProps = {
  fields: ConfigurationField[],
  title?: string;
};

const ConfigurationTable: React.FC<ConfigurationTableProps> = (props) => {
  return (
  <div className={s.ConfigurationTable}>
      {props.title && <h2 className={s.Title} id={props.title.toLowerCase()}>{props.title}</h2>}
      {props.fields.map(field => {
        return (
          <div className={s.Field} key={field.id}>
            <div className={s.FieldTitle}>
              <div className={s.FieldTitleText}>
                {field.title}
                {field.isRequired && <div className={s.RequiredFieldMark}>*</div>}
              </div>
            </div>
            <div className={s.FieldDescription}>{field.description}</div>
            <div className={s.FieldInput}>{field.input}</div>
          </div>
        );
      })}
    </div>
  );
}

export default ConfigurationTable;
