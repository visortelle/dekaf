import React, { useEffect, useMemo } from 'react';
import { GetHumanReadableSchemaRequest, SchemaInfo, SchemaType } from '../../../../grpc-web/tools/teal/pulsar/ui/api/v1/schema_pb';
import * as GrpcClient from '../../../app/contexts/GrpcClient/GrpcClient';
import * as Notifications from '../../../app/contexts/Notifications';
import s from './SchemaEntry.module.css'
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import Pre from '../../../ui/Pre/Pre';
import { H1 } from '../../../ui/H/H';
import Policies from '../Policies/Policies';
import {
  KeyValueSchema,
  KeyValueSchemaDefinition, schemaTypes,
  SchemaTypeT,
} from "../types";
import {View} from "../Schema";
import {decodeKeyValueSchema} from "../key-value-schema-utils";

export type SchemaEntryProps = {
  topic: string,
  schemaVersion: number,
  schemaInfo: SchemaInfo,
  isKeyValueSchema?: boolean,
  isOldKeyValueSchema?: boolean,
  view: View
};

const SchemaEntry: React.FC<SchemaEntryProps> = (props) => {
  const { notifyError } = Notifications.useContext();
  const { schemaServiceClient } = GrpcClient.useContext();
  const [_humanReadableSchema, setHumanReadableSchema] = React.useState<string>('');
  const [_humanReadableKeyValueSchema, setHumanReadableKeyValueSchema] = React.useState<KeyValueSchemaDefinition | undefined>(undefined);
  const [keyValueSchema, setKeyValueSchema] = React.useState<KeyValueSchema | undefined>(undefined);

  const humanReadableSchema = useMemo(() => {
    let result;
    try {
      result = JSON.stringify(JSON.parse(_humanReadableSchema || ''), null, 4);
      return result
    } catch (_) { }

    return _humanReadableSchema
  }, [_humanReadableSchema]);

  const humanReadableKeyValueSchema: KeyValueSchemaDefinition = useMemo(() => {
    let keySchemaDefinition;
    let valueSchemaDefinition;

    try {
      keySchemaDefinition = JSON.stringify(JSON.parse(_humanReadableKeyValueSchema?.keyDefinition || ''), null, 4);
    } catch (_) {
      keySchemaDefinition = _humanReadableKeyValueSchema?.keyDefinition;
    }

    try {
      valueSchemaDefinition = JSON.stringify(JSON.parse(_humanReadableKeyValueSchema?.valueDefinition || ''), null, 4);
    } catch (_) {
      valueSchemaDefinition = _humanReadableKeyValueSchema?.valueDefinition;
    }

    return {
      ..._humanReadableKeyValueSchema,
      keyDefinition: keySchemaDefinition || '',
      valueDefinition: valueSchemaDefinition || '',
    } as KeyValueSchemaDefinition
  }, [_humanReadableKeyValueSchema?.keyDefinition, _humanReadableKeyValueSchema?.valueDefinition]);


  useEffect(() => {
    async function getHumanReadableSchema() {
      const req = new GetHumanReadableSchemaRequest();
      req.setSchemaType(props.schemaInfo?.getType() || SchemaType.SCHEMA_TYPE_UNSPECIFIED);
      req.setRawSchema(props.schemaInfo?.getSchema() || '');

      const res = await schemaServiceClient.getHumanReadableSchema(req, {})
        .catch(err => notifyError(`Unable to get human readable schema. ${err}`));
      if (res === undefined) {
        return;
      }

      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get human readable schema. ${res.getStatus()?.getMessage()}`);
        return;
      }

      setHumanReadableSchema(res.getHumanReadableSchema());
    }

    async function getHumanReadableKeyValueSchema() {
      const decodedKeyValueSchema = await decodeKeyValueSchema(props.schemaInfo, schemaServiceClient, notifyError);

      if (decodedKeyValueSchema === undefined) {
        return;
      }

      const keyReq = new GetHumanReadableSchemaRequest();
      keyReq.setSchemaType(decodedKeyValueSchema?.keySchemaInfo?.getType() || SchemaType.SCHEMA_TYPE_UNSPECIFIED);
      keyReq.setRawSchema(decodedKeyValueSchema?.keySchemaInfo?.getSchema() || '');
      const valueReq = new GetHumanReadableSchemaRequest();
      valueReq.setSchemaType(decodedKeyValueSchema?.valueSchemaInfo?.getType() || SchemaType.SCHEMA_TYPE_UNSPECIFIED);
      valueReq.setRawSchema(decodedKeyValueSchema?.valueSchemaInfo?.getSchema() || '');

      const keyRes = await schemaServiceClient.getHumanReadableSchema(keyReq, {})
        .catch(err => notifyError(`Unable to get human readable key value schema's key definition. ${err}`));

      const valueRes = await schemaServiceClient.getHumanReadableSchema(valueReq, {})
        .catch(err => notifyError(`Unable to get human readable key value schema's value definition. ${err}`));

      if (keyRes === undefined || valueRes === undefined) {
        return;
      }

      if (keyRes.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get human readable schema. ${keyRes.getStatus()?.getMessage()}`);
        return;
      }

      if (valueRes.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get human readable schema. ${valueRes.getStatus()?.getMessage()}`);
        return;
      }

      setHumanReadableKeyValueSchema(
        {
          keyType: decodedKeyValueSchema?.keyType || "SCHEMA_TYPE_UNSPECIFIED",
          keyDefinition: keyRes.getHumanReadableSchema(),
          valueType: decodedKeyValueSchema?.valueType || "SCHEMA_TYPE_UNSPECIFIED",
          valueDefinition: valueRes.getHumanReadableSchema(),
          encodingType: decodedKeyValueSchema?.encodingType || "KEY_VALUE_ENCODING_TYPE_INLINE",
        } as KeyValueSchemaDefinition
      );
      setKeyValueSchema(decodedKeyValueSchema);
    }

    props.isKeyValueSchema ? getHumanReadableKeyValueSchema() : getHumanReadableSchema();
  }, []);

  return (
    <>
      {props.schemaInfo !== undefined && (
        props.isKeyValueSchema && keyValueSchema ? (
          <KeyValueSchemaEntry
            topic={props.topic}
            schemaVersion={props.schemaVersion}
            keyValueSchema={keyValueSchema}
            isOldKeyValueSchema={props.isOldKeyValueSchema}
            humanReadableKeyValueSchema={humanReadableKeyValueSchema}
          />
        ) : (
          <NormalSchemaEntry
            topic={props.topic}
            schemaVersion={props.schemaVersion}
            schemaInfo={props.schemaInfo}
            humanReadableSchema={humanReadableSchema}
          />
        )
      )}
    </>
  );
}

type NormalSchemaEntryProps = {
  topic: string,
  schemaVersion: number,
  schemaInfo: SchemaInfo,
  humanReadableSchema: string,
}
const NormalSchemaEntry: React.FC<NormalSchemaEntryProps> = (props) => {
  return (
    <div className={s.SchemaEntry}>
      <div className={s.Header}>
        <H1>View schema</H1>
      </div>
      <div className={s.FormControl}>
        <div className={s.Policies}>
          <Policies topic={props.topic} />
        </div>
      </div>
      <div className={s.FormControl}>
        <strong>Topic:</strong> {props.topic}
      </div>
      <div className={s.FormControl}>
        <strong>Version:</strong> {props.schemaVersion}
      </div>
      <div className={s.FormControl}>
        <strong>Type:</strong> {((Object.entries(SchemaType).find(([_, i]) => i === props.schemaInfo.getType()) || [])[0] || '').replace('SCHEMA_TYPE_', ' ')}
      </div>
      {props.humanReadableSchema !== undefined && props.humanReadableSchema.length > 0 && (
        <div className={s.FormControl}>
          <strong>Schema definition:</strong>

          <Pre>
            {props.humanReadableSchema}
          </Pre>
        </div>
      )}
    </div>
  )
}

type KeyValueSchemaEntryProps = {
  topic: string,
  schemaVersion?: number,
  keyValueSchema: KeyValueSchema,
  isOldKeyValueSchema?: boolean,
  humanReadableKeyValueSchema: KeyValueSchemaDefinition,
}

const KeyValueSchemaEntry: React.FC<KeyValueSchemaEntryProps> = (props) => {
  return (
    <div className={s.SchemaEntry}>
      <div className={s.Header}>
        <H1>View schema</H1>
      </div>
      <div className={s.FormControl}>
        <div className={s.Policies}>
          <Policies topic={props.topic} />
        </div>
      </div>
      <div className={s.FormControl}>
        <strong>Topic:</strong> {props.topic}
      </div>
      <div className={s.FormControl}>
        <strong>Version:</strong> {props.schemaVersion === undefined ? '-' : props.schemaVersion} {props.isOldKeyValueSchema !== undefined && props.isOldKeyValueSchema && ' ± X'}
      </div>
      <div className={s.FormControl}>
        <strong>Encoding Type:</strong> {props.keyValueSchema.encodingType.replace('KEY_VALUE_ENCODING_TYPE_', ' ')}
      </div>
      <div className={s.FormControl}>
        <strong>Key Type:</strong> {((Object.entries(SchemaType).find(([_, i]) => i === props.keyValueSchema.keySchemaInfo?.getType()) || [])[0] || '').replace('SCHEMA_TYPE_', ' ')}
      </div>
      {props.humanReadableKeyValueSchema.keyDefinition !== undefined && props.humanReadableKeyValueSchema.keyDefinition.length > 0 && (
        <div className={s.FormControl}>
          <strong>Key schema definition:</strong>

          <Pre>
            {props.humanReadableKeyValueSchema.keyDefinition}
          </Pre>
        </div>
      )}
      <div className={s.FormControl}>
        <strong>Value Type:</strong> {((Object.entries(SchemaType).find(([_, i]) => i === props.keyValueSchema.valueSchemaInfo?.getType()) || [])[0] || '').replace('SCHEMA_TYPE_', ' ')}
      </div>
      {props.humanReadableKeyValueSchema.valueDefinition !== undefined && props.humanReadableKeyValueSchema.valueDefinition.length > 0 && (
        <div className={s.FormControl}>
          <strong>Value schema definition:</strong>

          <Pre>
            {props.humanReadableKeyValueSchema.valueDefinition}
          </Pre>
        </div>
      )}
    </div>
  )
}

export default SchemaEntry;
