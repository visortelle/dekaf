import React from 'react';
import s from './SchemaTypeInput.module.css'
import Select from '../../../ui/Select/Select';
import { SchemaType } from '../../../../grpc-web/tools/teal/pulsar/ui/api/v1/schema_pb';

export type SchemaTypeT = keyof typeof SchemaType;

export type SchemaTypeInputProps = {
  onChange: (schemaType: SchemaTypeT) => void
  value: SchemaTypeT
};

const SchemaTypeInput: React.FC<SchemaTypeInputProps> = (props) => {
  return (
    <div className={s.SchemaTypeInput}>
      <Select<SchemaTypeT>
        list={[
          { type: 'item', title: 'None', value: 'SCHEMA_TYPE_NONE' },
          {
            type: 'group', title: 'Auto', items: [
              { type: 'item', title: 'Auto consume', value: 'SCHEMA_TYPE_AUTO_CONSUME' },
              { type: 'item', title: 'Auto publish', value: 'SCHEMA_TYPE_AUTO_PUBLISH' },
            ]
          },
          {
            type: 'group', title: 'Complex type', items: [
              { type: 'item', title: 'Avro', value: 'SCHEMA_TYPE_AVRO' },
              { type: 'item', title: 'Protobuf', value: 'SCHEMA_TYPE_PROTOBUF' },
              { type: 'item', title: 'Protobuf native', value: 'SCHEMA_TYPE_PROTOBUF_NATIVE' },
              { type: 'item', title: 'JSON', value: 'SCHEMA_TYPE_JSON' },
              { type: 'item', title: 'Key-value', value: 'SCHEMA_TYPE_KEY_VALUE' },
            ]
          },
          {
            type: 'group', title: 'Primitive type', items: [
              { type: 'item', title: 'Bytes', value: 'SCHEMA_TYPE_BYTES' },
              { type: 'item', title: 'Boolean', value: 'SCHEMA_TYPE_BOOLEAN' },
              { type: 'item', title: 'String (UTF-8)', value: 'SCHEMA_TYPE_STRING' },
              { type: 'item', title: 'Int 8', value: 'SCHEMA_TYPE_INT8' },
              { type: 'item', title: 'Int 16', value: 'SCHEMA_TYPE_INT16' },
              { type: 'item', title: 'Int 32', value: 'SCHEMA_TYPE_INT32' },
              { type: 'item', title: 'Int 64', value: 'SCHEMA_TYPE_INT64' },
              { type: 'item', title: 'Float', value: 'SCHEMA_TYPE_FLOAT' },
              { type: 'item', title: 'Double', value: 'SCHEMA_TYPE_DOUBLE' },
            ]
          },
          {
            type: 'group', title: 'Date time', items: [
              { type: 'item', title: 'Instant', value: 'SCHEMA_TYPE_INSTANT' },
              { type: 'item', title: 'Date', value: 'SCHEMA_TYPE_DATE' },
              { type: 'item', title: 'Time', value: 'SCHEMA_TYPE_TIME' },
              { type: 'item', title: 'Local date', value: 'SCHEMA_TYPE_LOCAL_DATE' },
              { type: 'item', title: 'Local time', value: 'SCHEMA_TYPE_LOCAL_TIME' },
              { type: 'item', title: 'Local date-time', value: 'SCHEMA_TYPE_LOCAL_DATE_TIME' },
            ]
          }

        ]}
        onChange={props.onChange}
        value={props.value}
      />
    </div>
  );
}

export default SchemaTypeInput;
