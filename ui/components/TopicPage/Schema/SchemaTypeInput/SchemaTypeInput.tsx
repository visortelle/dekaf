import React from 'react';
import s from './SchemaTypeInput.module.css'
import Select from '../../../ui/Select/Select';
import { SchemaTypeT } from '../types';


export type SchemaTypeInputProps = {
  onChange: (schemaType: SchemaTypeT) => void
  value: SchemaTypeT
  testId?: string
};

const SchemaTypeInput: React.FC<SchemaTypeInputProps> = (props) => {
  return (
    <div className={s.SchemaTypeInput}>
      <Select<SchemaTypeT>
        list={[
          { type: 'item', title: 'None', value: 'SCHEMA_TYPE_NONE' },
          {
            type: 'group', title: 'Complex type', items: [
              { type: 'item', title: 'AVRO', value: 'SCHEMA_TYPE_AVRO' },
              { type: 'item', title: 'PROTOBUF', value: 'SCHEMA_TYPE_PROTOBUF' },
              { type: 'item', title: 'PROTOBUF_NATIVE', value: 'SCHEMA_TYPE_PROTOBUF_NATIVE' },
              { type: 'item', title: 'JSON', value: 'SCHEMA_TYPE_JSON' },
              { type: 'item', title: 'KEY_VALUE', value: 'SCHEMA_TYPE_KEY_VALUE' },
            ]
          },
          {
            type: 'group', title: 'Primitive type', items: [
              { type: 'item', title: 'BYTES', value: 'SCHEMA_TYPE_BYTES' },
              { type: 'item', title: 'BOOLEAN', value: 'SCHEMA_TYPE_BOOLEAN' },
              { type: 'item', title: 'STRING', value: 'SCHEMA_TYPE_STRING' },
              { type: 'item', title: 'INT8', value: 'SCHEMA_TYPE_INT8' },
              { type: 'item', title: 'INT16', value: 'SCHEMA_TYPE_INT16' },
              { type: 'item', title: 'INT32', value: 'SCHEMA_TYPE_INT32' },
              { type: 'item', title: 'INT64', value: 'SCHEMA_TYPE_INT64' },
              { type: 'item', title: 'FLOAT', value: 'SCHEMA_TYPE_FLOAT' },
              { type: 'item', title: 'DOUBLE', value: 'SCHEMA_TYPE_DOUBLE' },
            ]
          },
          {
            type: 'group', title: 'Date time', items: [
              { type: 'item', title: 'INSTANT', value: 'SCHEMA_TYPE_INSTANT' },
              { type: 'item', title: 'DATE', value: 'SCHEMA_TYPE_DATE' },
              { type: 'item', title: 'TIME', value: 'SCHEMA_TYPE_TIME' },
              { type: 'item', title: 'LOCAL_DATE', value: 'SCHEMA_TYPE_LOCAL_DATE' },
              { type: 'item', title: 'LOCAL_TIME', value: 'SCHEMA_TYPE_LOCAL_TIME' },
              { type: 'item', title: 'LOCAL_DATE_TIME', value: 'SCHEMA_TYPE_LOCAL_DATE_TIME' },
            ]
          }
        ]}
        onChange={props.onChange}
        value={props.value}
        testId={props.testId}
      />
    </div>
  );
}

export default SchemaTypeInput;
