import React from 'react';
import s from './ConfigurationTable.module.css'
import { ListField } from './List/ListField';
import { BooleanValue, ConfigurationField, ListValue, NumberValue, StringValue, Value } from './values';

function GenericField<V extends Value>(props: ConfigurationField<V>): React.ReactElement {
  let el = <></>;

  switch (props.value.type) {
    case 'boolean': el = <BooleanField {...(props as unknown as ConfigurationField<BooleanValue>)} />; break;
    case 'number': el = <NumberField {...(props as unknown as ConfigurationField<NumberValue>)} />; break;
    case 'string': el = <StringField {...(props as unknown as ConfigurationField<StringValue>)} />; break;
    case 'list': el = <ListField {...(props as unknown as ConfigurationField<ListValue<any>>)} />; break;
    default: el = <div style={{ color: 'var(--accent-color-red)' }}>Unsupported value type: {props.value.type}</div>;
  }

  return el;
}

function BooleanField(props: ConfigurationField<BooleanValue>): React.ReactElement {
  return (
    <input
      type="checkbox"
      checked={props.value.value}
    />
  )
}

function NumberField(props: ConfigurationField<NumberValue>): React.ReactElement {
  return (
    <input
      type="number"
      value={props.value.value}
    />
  )
}

function StringField(props: ConfigurationField<StringValue>): React.ReactElement {
  return (
    <input
      type="text"
      value={props.value.value}
    />
  )
}

export type ConfigurationTableProps = {
  fields: ConfigurationField<any>[],
};

const ConfigurationTable: React.FC<ConfigurationTableProps> = (props) => {
  return (
    <div className={s.ConfigurationTable}>
      <div className={s.ColumnHeaders}>
        <div className={s.ColumnHeader}>Property</div>
        <div className={s.ColumnHeader}>Description</div>
        <div className={s.ColumnHeader}>Value</div>
      </div>
      {props.fields.map(field => {
        return (
          <div className={s.Field} key={field.id}>
            <div className={s.FieldTitle}>{field.title}</div>
            <div className={s.FieldDescription}>{field.description}</div>
            <div className={s.FieldValue}><GenericField {...field} /></div>
          </div>
        );
      })}
    </div>
  );
}

export default ConfigurationTable;
