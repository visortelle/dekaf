import React from 'react';
import { SchemaInfo } from '../../../../grpc-web/tools/teal/pulsar/ui/api/v1/schema_pb';
import s from './SchemaEntry.module.css'

export type SchemaEntryProps = {
  topic: string,
  schemaVersion: number,
};

const SchemaEntry: React.FC<SchemaEntryProps> = (props) => {
  return (
    <div className={s.SchemaEntry}>
      schema entry
    </div>
  );
}

export default SchemaEntry;
