import React, { useEffect } from 'react';
import { GetHumanReadableSchemaRequest, SchemaInfo, SchemaType } from '../../../../grpc-web/tools/teal/pulsar/ui/api/v1/schema_pb';
import * as PulsarGrpcClient from '../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import * as Notifications from '../../../app/contexts/Notifications';
import s from './SchemaEntry.module.css'
import { Code } from '../../../../grpc-web/google/rpc/code_pb';

export type SchemaEntryProps = {
  topic: string,
  schemaVersion: number,
  schemaInfo: SchemaInfo,
};

const SchemaEntry: React.FC<SchemaEntryProps> = (props) => {
  const { notifyError } = Notifications.useContext();
  const { schemaServiceClient } = PulsarGrpcClient.useContext();
  const [humanReadableSchema, setHumanReadableSchema] = React.useState<string | undefined>('');

  useEffect(() => {
    async function getHumanReadableSchema() {
      const req = new GetHumanReadableSchemaRequest();
      req.setSchemaType(props.schemaInfo.getType());
      req.setRawSchema(props.schemaInfo.getSchema());

      const res = await schemaServiceClient.getHumanReadableSchema(req, {}).catch(err => notifyError(`Unable to get human readable schema. ${err}`));
      if (res === undefined) {
        return;
      }

      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get human readable schema. ${res.getStatus()?.getMessage()}`);
        return;
      }

      setHumanReadableSchema(res.getHumanReadableSchema());
    }

    getHumanReadableSchema();
  }, []);

  return (
    <div className={s.SchemaEntry}>
      <div className={s.Stat}>
        <strong>Topic:</strong> {props.topic}
      </div>
      <div className={s.Stat}>
        <strong>Version:</strong> {props.schemaVersion}
      </div>
      <div className={s.Stat}>
        <strong>Type:</strong> {((Object.entries(SchemaType).find(([_, i]) => i === props.schemaInfo.getType()) || [])[0] || '').replace('SCHEMA_TYPE_', ' ')}
      </div>
      {humanReadableSchema !== undefined && humanReadableSchema.length > 0 && (
        <div className={s.Stat}>
          <strong>Schema definition:</strong>
          <div className={s.SchemaDefinitionContainer}>
            <pre className={s.SchemaDefinition}>
              {humanReadableSchema}
            </pre>
          </div>

        </div>
      )}
    </div>
  );
}

export default SchemaEntry;
