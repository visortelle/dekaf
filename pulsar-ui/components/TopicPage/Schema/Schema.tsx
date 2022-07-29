import React, { useEffect, useState } from 'react';
import s from './Schema.module.css'
import * as PulsarGrpcClient from '../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import * as Notifications from '../../app/contexts/Notifications';
import useSWR from 'swr';
import { swrKeys } from '../../swrKeys';
import { CreateSchemaRequest, GetLatestSchemaInfoRequest, SchemaInfo, SchemaType, TestCompatibilityRequest } from '../../../grpc-web/tools/teal/pulsar/ui/api/v1/schema_pb';
import { Code } from '../../../grpc-web/google/rpc/code_pb';
import SchemaTypeInput, { SchemaTypeT } from './SchemaTypeInput/SchemaTypeInput';
import Button from '../../ui/Button/Button';
import Input from '../../ui/Input/Input';
import ProtobufNativeEditor from './ProtobufNativeEditor/ProtobufNativeEditor';

export type SchemaProps = {
  tenant: string,
  namespace: string,
  topic: string,
  topicType: 'persistent' | 'non-persistent'
};

type SchemaCompatibiity = {
  isCompatible: boolean,
  strategy: string
}

const Schema: React.FC<SchemaProps> = (props) => {
  const { schemaServiceClient } = PulsarGrpcClient.useContext();
  const { notifySuccess, notifyError } = Notifications.useContext();
  const [schemaType, setSchemaType] = useState<SchemaTypeT>('SCHEMA_TYPE_PROTOBUF_NATIVE');
  const [schemaName, setSchemaName] = useState<string>('');
  const [schema, setSchema] = useState<Uint8Array | undefined>(undefined);
  const [schemaCompatibility, setSchemaCompatibility] = useState<SchemaCompatibiity | undefined>(undefined);

  const topic = `${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`;

  const { data: latestSchemaInfo, error: latestSchemaInfoError } = useSWR(
    swrKeys.pulsar.schemas.getLatestSchemaInfo._(topic),
    async () => {
      const req = new GetLatestSchemaInfoRequest();
      req.setTopic(topic);
      return await schemaServiceClient.getLatestSchemaInfo(req, {});
    },
  );

  if (latestSchemaInfoError || (latestSchemaInfo && latestSchemaInfo?.getStatus()?.getCode() !== Code.OK)) {
    notifyError(`Unable to get latest schema info. ${latestSchemaInfoError}`);
  }

  const checkSchemaCompatibility = async () => {
    if (schema === undefined) {
      return;
    }

    const schemaInfo = new SchemaInfo();
    schemaInfo.setName(schemaName);
    schemaInfo.setSchema(schema);
    schemaInfo.setType(SchemaType[schemaType]);

    const req = new TestCompatibilityRequest();
    req.setTopic(topic);
    req.setSchemaInfo(schemaInfo);

    const res = await schemaServiceClient.testCompatibility(req, {}).catch(err => notifyError(err));
    if (res === undefined) {
      return;
    }

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to check schema compatibility. ${res.getStatus()?.getMessage()}`);
      setSchemaCompatibility(undefined);
    }

    setSchemaCompatibility({
      isCompatible: res.getIsCompatible(),
      strategy: res.getStrategy()
    });
  }

  useEffect(() => {
    checkSchemaCompatibility();
  }, [schema])

  // console.log('latest schema info', latestSchemaInfo);

  return (
    <div className={s.Schema}>

      <div className={s.FormControl}>
        <strong>Schema name</strong>
        <Input value={schemaName} onChange={setSchemaName} placeholder="New schema" />
      </div>

      <div className={s.FormControl}>
        <strong>Schema type</strong>
        <SchemaTypeInput value={schemaType} onChange={setSchemaType} />

        <div>
          {/* {schemaType === 'SCHEMA_TYPE_PROTOBUF' && (
            <div>
              <textarea value={schema} onChange={e => setSchema(e.target.value)}></textarea>
            </div>
          )} */}
          {schemaType === 'SCHEMA_TYPE_PROTOBUF_NATIVE' && (
            // https://github.com/apache/pulsar/blob/c01b1eeda3221bdbf863bf0f3f8373e93d90adef/pulsar-client/src/test/java/org/apache/pulsar/client/impl/schema/ProtobufNativeSchemaTest.java
            // fileDescriptorSet: "CtMDCgpUZXN0LnByb3RvEgVwcm90bxoSRXh0ZXJuYWxUZXN0LnByb3RvImUKClN1Yk1lc3NhZ2USCwoDZm9vGAEgASgJEgsKA2JhchgCIAEoARo9Cg1OZXN0ZWRNZXNzYWdlEgsKA3VybBgBIAEoCRINCgV0aXRsZRgCIAEoCRIQCghzbmlwcGV0cxgDIAMoCSLlAQoLVGVzdE1lc3NhZ2USEwoLc3RyaW5nRmllbGQYASABKAkSEwoLZG91YmxlRmllbGQYAiABKAESEAoIaW50RmllbGQYBiABKAUSIQoIdGVzdEVudW0YBCABKA4yDy5wcm90by5UZXN0RW51bRImCgtuZXN0ZWRGaWVsZBgFIAEoCzIRLnByb3RvLlN1Yk1lc3NhZ2USFQoNcmVwZWF0ZWRGaWVsZBgKIAMoCRI4Cg9leHRlcm5hbE1lc3NhZ2UYCyABKAsyHy5wcm90by5leHRlcm5hbC5FeHRlcm5hbE1lc3NhZ2UqJAoIVGVzdEVudW0SCgoGU0hBUkVEEAASDAoIRkFJTE9WRVIQAUItCiVvcmcuYXBhY2hlLnB1bHNhci5jbGllbnQuc2NoZW1hLnByb3RvQgRUZXN0YgZwcm90bzMKoAEKEkV4dGVybmFsVGVzdC5wcm90bxIOcHJvdG8uZXh0ZXJuYWwiOwoPRXh0ZXJuYWxNZXNzYWdlEhMKC3N0cmluZ0ZpZWxkGAEgASgJEhMKC2RvdWJsZUZpZWxkGAIgASgBQjUKJW9yZy5hcGFjaGUucHVsc2FyLmNsaWVudC5zY2hlbWEucHJvdG9CDEV4dGVybmFsVGVzdGIGcHJvdG8z"
            // rootFileDescriptorName: "Test.proto"
            // rootMessageTypeName: "proto.TestMessage"
            <div>
              <ProtobufNativeEditor onSchemaCompiled={setSchema} />
            </div>
          )}
        </div>
      </div>

      {schemaCompatibility !== undefined && (
        <div>
          <strong>Schema compatibility</strong>
          {schemaCompatibility.isCompatible ? 'Compatible' : 'Incompatible'}
          <div>Strategy: {schemaCompatibility.strategy}</div>
        </div>
      )}

      <div>
        <Button
          text='Create'
          type='primary'
          disabled={!schemaCompatibility?.isCompatible}
          onClick={async () => {
            if (schema === undefined) {
              return;
            }

            const schemaInfo = new SchemaInfo();
            schemaInfo.setName(schemaName);
            schemaInfo.setType(SchemaType[schemaType]);
            schemaInfo.setSchema(schema);

            const req = new CreateSchemaRequest();
            req.setTopic(topic);
            req.setSchemaInfo(schemaInfo);

            const res = await schemaServiceClient.createSchema(req, {}).catch(err => notifyError(`Unable to create schema. ${err}`));
            if (res !== undefined && res.getStatus()?.getCode() !== Code.OK) {
              notifyError(`Unable to create schema. ${res.getStatus()?.getMessage()}`);
            }
            if (res !== undefined && res.getStatus()?.getCode() === Code.OK) {
              notifySuccess(`Schema successfully created.`);
            }
          }}
        />
      </div>
    </div>
  );
}

export default Schema;
