import React from 'react';
import s from './ConfigurationTable.module.css'

export type ConfigurationField = {
  id: string;
  title: string;
  description: React.ReactElement;
  input: React.ReactElement;
};

export type ConfigurationTableProps = {
  fields: ConfigurationField[],
  title?: string;
};

const ConfigurationTable: React.FC<ConfigurationTableProps> = (props) => {
  return (
    <div className={s.ConfigurationTable}>
      {props.title && <h2 className={s.Title}>{props.title}</h2>}
      <div className={s.ColumnHeaders}>
        <div className={s.ColumnHeader}>Name</div>
        <div className={s.ColumnHeader}>Description</div>
        <div className={s.ColumnHeader}>Value</div>
      </div>
      {props.fields.map(field => {
        return (
          <div className={s.Field} key={field.id}>
            <div className={s.FieldTitle}>{field.title}</div>
            <div className={s.FieldDescription}>{field.description}</div>
            <div className={s.FieldInput}>{field.input}</div>
          </div>
        );
      })}
    </div>
  );
}

export default ConfigurationTable;
