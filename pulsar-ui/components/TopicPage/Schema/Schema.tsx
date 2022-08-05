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
import SmallButton from '../../ui/SmallButton/SmallButton';
import SchemaEntry from './SchemaEntry/SchemaEntry';
import { usePrevious } from '../../app/hooks/use-previous';

export type SchemaProps = {
  tenant: string,
  namespace: string,
  topic: string,
  topicType: 'persistent' | 'non-persistent'
};

type CurrentView = { type: 'create-schema' } | { type: 'schema-entry', topic: string, schemaVersion: number, schemaInfo: SchemaInfo };

const Schema: React.FC<SchemaProps> = (props) => {
  const [currentView, setCurrentView] = useState<CurrentView>({ type: 'create-schema' });

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

  const prevLastestSchemaInfo = usePrevious(latestSchemaInfo);

  if (latestSchemaInfoError !== undefined) {
    notifyError(`Unable to get latest schema info. ${latestSchemaInfoError}`);
  }

  if (latestSchemaInfo !== undefined && latestSchemaInfo.getStatus()?.getCode() !== Code.OK) {
    notifyError(`Unable to get latest schema info. ${latestSchemaInfo?.getStatus()?.getMessage()}`);
  }

  useEffect(() => {
    if (latestSchemaInfo === undefined) {
      setCurrentView({ type: 'create-schema' });
    }
    if (latestSchemaInfo !== undefined && latestSchemaInfo.getStatus()?.getCode() === Code.OK && prevLastestSchemaInfo === undefined) {
      const schemaInfo = latestSchemaInfo.getSchemaInfo();
      if (schemaInfo !== undefined) {
        setCurrentView({ type: 'schema-entry', topic: topic, schemaVersion: latestSchemaInfo.getSchemaVersion(), schemaInfo });
      }
    }
  }, [latestSchemaInfo]);

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

  const refetchData = async () => {
    await mutate(swrKeys.pulsar.schemas.getLatestSchemaInfo._(topic));
    await mutate(swrKeys.pulsar.schemas.listSchemas._(topic));
  }

  return (
    <div className={s.Schema}>
      <div className={s.Schemas}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8rem 12rem', borderBottom: '1px solid #ddd' }}>
          <div style={{ display: 'flex', marginRight: '12rem', flex: '1 1 auto', justifyContent: 'center' }}>
            <SmallButton
              text='Create'
              type='primary'
              onClick={() => setCurrentView({ type: 'create-schema' })}
            />
          </div>
          <div>
            <SmallButton
              text='Delete'
              type='danger'
              disabled={schemas === undefined ? true : schemas?.getSchemasList().length === 0}
              onClick={async () => {
                const req = new DeleteSchemaRequest();
                req.setTopic(props.topic);
                const res = await schemaServiceClient.deleteSchema(req, {}).catch(err => notifyError(err));

                if (res === undefined) {
                  return;
                }

                if (res.getStatus()?.getCode() === Code.OK) {
                  notifySuccess('Successfully deleted the topic schema');
                } else {
                  notifyError(res.getStatus()?.getMessage());
                }

                await refetchData();

                setCurrentView({ type: 'create-schema' });
              }}
            />
          </div>
        </div>

        <div className={s.SchemaList}>
          {schemas?.getSchemasList().length === 0 && (
            <div style={{ padding: '8rem 12rem' }}>
              No schemas registered for this topic.
            </div>
          )}
          {schemas?.getSchemasList().sort((a, b) => b.getSchemaVersion() - a.getSchemaVersion()).map((schema) => {
            const schemaInfo = schema.getSchemaInfo();
            const schemaVersion = schema.getSchemaVersion();
            if (schemaInfo === undefined) {
              return null;
            }

            return (
              <SchemaListEntry
                key={schemaVersion}
                schemaInfo={schemaInfo}
                version={schemaVersion}
                isSelected={currentView.type === 'schema-entry' && currentView.schemaVersion === schemaVersion}
                onClick={() => setCurrentView({ type: 'schema-entry', topic, schemaVersion, schemaInfo })}
              />
            );
          })}
        </div>
      </div>
      {schemas !== undefined && (
        <div className={s.Content}>
          {currentView.type === 'create-schema' && (
            <CreateSchema
              topic={topic}
              isTopicHasAnySchema={(schemas.getSchemasList().length || 0) > 0}
              onCreateSuccess={async () => {
                refetchData();

                const req = new GetLatestSchemaInfoRequest();
                req.setTopic(topic);
                const res = await schemaServiceClient.getLatestSchemaInfo(req, {}).catch(err => notifyError(`Unable to get latest schema info. ${err}`));
                if (res === undefined) {
                  return;
                }
                if (res.getStatus()?.getCode() !== Code.OK) {
                  notifyError(`Unable to get latest schema info. ${res.getStatus()?.getMessage()}`);
                  return;
                }

                const schemaInfo = res.getSchemaInfo();
                if (schemaInfo === undefined) {
                  return;
                }

                setCurrentView({ type: 'schema-entry', topic: topic, schemaVersion: res.getSchemaVersion(), schemaInfo });
              }}
            />
          )}
          {currentView.type === 'schema-entry' && (
            <SchemaEntry
              key={`${currentView.topic}/${currentView.schemaVersion}`}
              topic={currentView.topic}
              schemaVersion={currentView.schemaVersion}
              schemaInfo={currentView.schemaInfo}
            />
          )}
        </div>
      )}
    </div>
  );
}

type SchemaListEntryProps = {
  schemaInfo: SchemaInfo;
  version: number;
  isSelected: boolean;
  onClick: () => void;
}
const SchemaListEntry: React.FC<SchemaListEntryProps> = (props) => {
  return (
    <div
      className={`${s.SchemaListEntry} ${props.isSelected ? s.SchemaListEntrySelected : ''}`}
      onClick={props.onClick}
    >
      <div>
        <strong>Version:</strong> {props.version}
      </div>
      <div>
        <strong>Type:</strong> {schemaTypes[props.schemaInfo.getType()].replace('SCHEMA_TYPE_', '')}
      </div>
    </div>
  );
}


export default Schema;
