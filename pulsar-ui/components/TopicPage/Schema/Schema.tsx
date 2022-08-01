import React, { useEffect, useState } from 'react';
import s from './Schema.module.css'
import * as PulsarGrpcClient from '../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import * as Notifications from '../../app/contexts/Notifications';
import useSWR, { mutate } from 'swr';
import { swrKeys } from '../../swrKeys';
import { DeleteSchemaRequest, GetLatestSchemaInfoRequest, ListSchemasRequest, SchemaInfo } from '../../../grpc-web/tools/teal/pulsar/ui/api/v1/schema_pb';
import { Code } from '../../../grpc-web/google/rpc/code_pb';
import CreateSchema from './CreateSchema/CreateSchema';
import { schemaTypes } from './types';
import Button from '../../ui/Button/Button';

export type SchemaProps = {
  tenant: string,
  namespace: string,
  topic: string,
  topicType: 'persistent' | 'non-persistent'
};

const Schema: React.FC<SchemaProps> = (props) => {
  const { schemaServiceClient } = PulsarGrpcClient.useContext();
  const { notifySuccess, notifyError } = Notifications.useContext();

  const topic = `${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`;

  const { data: latestSchemaInfo, error: latestSchemaInfoError } = useSWR(
    swrKeys.pulsar.schemas.getLatestSchemaInfo._(topic),
    async () => {
      const req = new GetLatestSchemaInfoRequest();
      req.setTopic(topic);
      return await schemaServiceClient.getLatestSchemaInfo(req, {});
    },
  );

  if (latestSchemaInfoError !== undefined) {
    notifyError(`Unable to get latest schema info. ${latestSchemaInfoError}`);
  }

  if (latestSchemaInfo !== undefined && latestSchemaInfo.getStatus()?.getCode() !== Code.OK) {
    notifyError(`Unable to get latest schema info. ${latestSchemaInfo?.getStatus()?.getMessage()}`);
  }

  const { data: schemas, error: schemasError } = useSWR(
    swrKeys.pulsar.schemas.listSchemas._(topic),
    async () => {
      const req = new ListSchemasRequest();
      req.setTopic(topic);
      return await schemaServiceClient.listSchemas(req, {});
    },
  );

  if (schemasError !== undefined) {
    notifyError(`Unable to get schemas. ${schemasError}`);
  }

  if (schemas !== undefined && schemas.getStatus()?.getCode() !== Code.OK) {
    notifyError(`Unable to get schemas. ${schemas?.getStatus()?.getMessage()}`);
  }

  const refetchData = () => {
    mutate(swrKeys.pulsar.schemas.getLatestSchemaInfo._(topic));
    mutate(swrKeys.pulsar.schemas.listSchemas._(topic));
  }

  // console.log('latest schema info', latestSchemaInfo);
  // console.log('schemas', schemas);

  console.log('schemas', schemas?.getSchemaInfosList());
  return (
    <div className={s.Schema}>
      <div className={s.Schemas}>
        {schemas?.getSchemaInfosList().map((schemaInfo, i) => {
          return (
            <SchemaListEntry
              key={i}
              schemaInfo={schemaInfo}
              isLatestSchema={i === schemas?.getSchemaInfosList().length - 1}
              onDeleteLatestSchema={async () => {
                const req = new DeleteSchemaRequest();
                req.setTopic(props.topic);
                const res = await schemaServiceClient.deleteSchema(req, {}).catch(err => notifyError(err));

                if (res === undefined) {
                  return;
                }

                if (res.getStatus()?.getCode() === Code.OK) {
                  notifySuccess('Successfully deleted latest schema');
                } else {
                  notifyError(res.getStatus()?.getMessage());
                }

                refetchData();
              }}
            />
          );
        })}
      </div>
      <div className={s.Content}>
        <CreateSchema
          topic={topic}
          isTopicHasAnySchema={(schemas?.getSchemaInfosList().length || 0) > 0}
          onCreateSuccess={refetchData}
        />
      </div>
    </div>
  );
}

type SchemaListEntryProps = {
  schemaInfo: SchemaInfo;
  isLatestSchema: boolean;
  onDeleteLatestSchema: () => void;
}
const SchemaListEntry: React.FC<SchemaListEntryProps> = (props) => {
  return (
    <div>
      {props.isLatestSchema && (
        <Button
          text="Delete"
          type='danger'
          onClick={props.onDeleteLatestSchema}
        />
      )}
      <div>
        {props.schemaInfo.getName()}
      </div>
      <div>
        {schemaTypes[props.schemaInfo.getType()].replace('SCHEMA_TYPE_', '')}
      </div>
    </div>
  );
}


export default Schema;
