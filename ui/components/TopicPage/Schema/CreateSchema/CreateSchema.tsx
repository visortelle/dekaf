import React, { useEffect, useState } from "react";
import {
  CreateSchemaRequest,
  SchemaInfo,
  SchemaType,
  TestCompatibilityRequest,
} from "../../../../grpc-web/tools/teal/pulsar/ui/api/v1/schema_pb";
import Button from "../../../ui/Button/Button";
import ProtobufNativeEditor from "../ProtobufNativeEditor/ProtobufNativeEditor";
import AvroEditor from "../AvroEditor/AvroEditor";
import { SchemaTypeT } from "../types";
import * as PulsarGrpcClient from "../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient";
import * as Notifications from "../../../app/contexts/Notifications";
import s from "./CreateSchema.module.css";
import { Code } from "../../../../grpc-web/google/rpc/code_pb";
import SchemaTypeInput from "../SchemaTypeInput/SchemaTypeInput";
import { H1 } from "../../../ui/H/H";
import Policies from "../Policies/Policies";
import Pre from "../../../ui/Pre/Pre";
import HelpIcon from "../../../ui/ConfigurationTable/HelpIcon/HelpIcon";

export type CreateSchemaProps = {
  topicType: "persistent" | "non-persistent";
  tenant: string;
  namespace: string;
  topic: string;
  isTopicHasAnySchema: boolean;
  defaultSchemaType: SchemaTypeT;
  defaultSchemaDefinition: string | undefined;
  onCreateSuccess: () => void;
};

type SchemaCompatibility = {
  isCompatible: boolean;
  strategy: string;
  incompatibleReason: string;
  incompatibleReasonFull: string;
};

type Schema = {
  type: SchemaTypeT;
  definition: Uint8Array | undefined;
  updateState: "in-progress" | "ready";
};

const CreateSchema: React.FC<CreateSchemaProps> = (props) => {
  const { schemaServiceClient } = PulsarGrpcClient.useContext();
  const { notifySuccess, notifyError } = Notifications.useContext();
  const topicFqn = `${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`;

  const [schema, setSchema] = useState<Schema>({
    type: props.defaultSchemaType,
    definition: undefined,
    updateState: isSchemaShouldHaveDefinition(props.defaultSchemaType) ? "in-progress" : "ready",
  });
  const [schemaCompatibility, setSchemaCompatibility] = useState<SchemaCompatibility | undefined>(undefined);

  const schemaShouldHaveDefinition = isSchemaShouldHaveDefinition(schema.type);

  const checkSchemaCompatibility = async () => {
    if (schemaShouldHaveDefinition && schema.definition === undefined) {
      return;
    }

    const schemaInfo = new SchemaInfo();

    if (schemaShouldHaveDefinition && schema.definition !== undefined) {
      schemaInfo.setSchema(schema.definition);
    }
    schemaInfo.setType(SchemaType[schema.type]);

    const req = new TestCompatibilityRequest();
    req.setTopic(topicFqn);
    req.setSchemaInfo(schemaInfo);

    const res = await schemaServiceClient.testCompatibility(req, {}).catch((err) => notifyError(err));
    if (res === undefined) {
      return;
    }

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to check schema compatibility. ${res.getStatus()?.getMessage()}`);
      setSchemaCompatibility(undefined);
    }

    setSchemaCompatibility({
      isCompatible: props.isTopicHasAnySchema ? res.getIsCompatible() : res.getIncompatibleReason().includes("not have existing schema"),
      strategy: res.getStrategy(),
      incompatibleReason: res.getIncompatibleReason(),
      incompatibleReasonFull: res.getIncompatibleFullReason(),
    });
  };

  useEffect(() => {
    if (schemaShouldHaveDefinition && schema.definition === undefined) {
      setSchemaCompatibility(undefined);
    }

    if (schema.updateState === "ready") {
      checkSchemaCompatibility();
    }
  }, [schema]);

  return (
    <div>
      <div className={s.CreateSchema}>
        <div className={s.Header}>
          <H1>Create schema</H1>

          {schema.type === "SCHEMA_TYPE_PROTOBUF" && (
            <div style={{ maxWidth: "480rem", color: "var(--accent-color-blue)" }}>
              <span>
                Consider using <code>PROTOBUF_NATIVE</code> schema type instead of <code>PROTOBUF</code> schema type.&nbsp;
                <HelpIcon
                  help={
                    <ul>
                      <li>
                        <code>PROTOBUF</code> schema type uses Avro schema definition format and Protobuf 3 serialization format.
                        <br />
                        <code>PROTOBUF_NATIVE</code> schema type uses Protobuf 3 for both - schema definition and serialization.
                      </li>
                      <li>
                        We don't support producing and consuming messages to the topics with PROTOBUF schema because topics with the
                        <code>PROTOBUF</code> schema don't support <code>AUTO_CONSUME</code> and <code>AUTO_PRODUCE</code> features.
                      </li>
                      <br />
                    </ul>
                  }
                />
              </span>
            </div>
          )}
        </div>

        <div className={s.FormControl}>
          <div className={s.Policies}>
            <Policies topic={topicFqn} />
          </div>
        </div>

        <div className={s.FormControl}>
          <strong>Schema type</strong>
          <SchemaTypeInput
            value={schema.type}
            onChange={(v) => {
              setSchema((schema) => {
                return {
                  ...schema,
                  type: v,
                  updateState: isSchemaShouldHaveDefinition(v) ? "in-progress" : "ready",
                };
              });
              setSchemaCompatibility(undefined);
            }}
          />
        </div>

        <div className={s.FormControl}>
          {schema.type === "SCHEMA_TYPE_KEY_VALUE" && (
            <div style={{ color: "var(--accent-color-red)" }}>
              Support of KEY_VALUE schema type is coming in further releases. Stay tuned.
            </div>
          )}
          {schema.type === "SCHEMA_TYPE_PROTOBUF_NATIVE" && (
            // https://github.com/apache/pulsar/blob/c01b1eeda3221bdbf863bf0f3f8373e93d90adef/pulsar-client/src/test/java/org/apache/pulsar/client/impl/schema/ProtobufNativeSchemaTest.java
            // fileDescriptorSet: "CtMDCgpUZXN0LnByb3RvEgVwcm90bxoSRXh0ZXJuYWxUZXN0LnByb3RvImUKClN1Yk1lc3NhZ2USCwoDZm9vGAEgASgJEgsKA2JhchgCIAEoARo9Cg1OZXN0ZWRNZXNzYWdlEgsKA3VybBgBIAEoCRINCgV0aXRsZRgCIAEoCRIQCghzbmlwcGV0cxgDIAMoCSLlAQoLVGVzdE1lc3NhZ2USEwoLc3RyaW5nRmllbGQYASABKAkSEwoLZG91YmxlRmllbGQYAiABKAESEAoIaW50RmllbGQYBiABKAUSIQoIdGVzdEVudW0YBCABKA4yDy5wcm90by5UZXN0RW51bRImCgtuZXN0ZWRGaWVsZBgFIAEoCzIRLnByb3RvLlN1Yk1lc3NhZ2USFQoNcmVwZWF0ZWRGaWVsZBgKIAMoCRI4Cg9leHRlcm5hbE1lc3NhZ2UYCyABKAsyHy5wcm90by5leHRlcm5hbC5FeHRlcm5hbE1lc3NhZ2UqJAoIVGVzdEVudW0SCgoGU0hBUkVEEAASDAoIRkFJTE9WRVIQAUItCiVvcmcuYXBhY2hlLnB1bHNhci5jbGllbnQuc2NoZW1hLnByb3RvQgRUZXN0YgZwcm90bzMKoAEKEkV4dGVybmFsVGVzdC5wcm90bxIOcHJvdG8uZXh0ZXJuYWwiOwoPRXh0ZXJuYWxNZXNzYWdlEhMKC3N0cmluZ0ZpZWxkGAEgASgJEhMKC2RvdWJsZUZpZWxkGAIgASgBQjUKJW9yZy5hcGFjaGUucHVsc2FyLmNsaWVudC5zY2hlbWEucHJvdG9CDEV4dGVybmFsVGVzdGIGcHJvdG8z"
            // rootFileDescriptorName: "Test.proto"
            // rootMessageTypeName: "proto.TestMessage"
            <div className={s.FormControl}>
              <ProtobufNativeEditor
                onSchemaDefinition={(v) => setSchema((schema) => ({ ...schema, definition: v, updateState: "ready" }))}
                onSchemaDefinitionError={() => {
                  setSchema((schema) => ({ ...schema, definition: undefined, updateState: "in-progress" }));
                  setSchemaCompatibility(undefined);
                }}
              />
            </div>
          )}

          {(schema.type === "SCHEMA_TYPE_AVRO" || schema.type === "SCHEMA_TYPE_JSON" || schema.type === "SCHEMA_TYPE_PROTOBUF") && (
            <div className={s.FormControl}>
              <AvroEditor
                key={schema.type}
                defaultSchemaDefinition={props.defaultSchemaDefinition}
                onSchemaDefinition={(v) => {
                  if (v === undefined) {
                    setSchema((schema) => ({ ...schema, definition: undefined, updateState: "in-progress" }));
                    setSchemaCompatibility(undefined);
                    return;
                  }

                  setSchema((schema) => ({ ...schema, definition: v, updateState: "ready" }));
                }}
              />
            </div>
          )}
        </div>

        {schemaCompatibility !== undefined && (
          <div className={s.FormControl}>
            <div>
              <strong>Compatibility: </strong>
              {schemaCompatibility.isCompatible ? (
                <span style={{ color: "var(--accent-color-green)", fontWeight: "bold" }}>Compatible</span>
              ) : (
                <span style={{ color: "var(--accent-color-red)", fontWeight: "bold" }}>Incompatible</span>
              )}
            </div>
            {schemaCompatibility.strategy && (
              <div>
                <strong>Strategy:</strong> {schemaCompatibility.strategy}
              </div>
            )}
            {!schemaCompatibility.isCompatible && (
              <div>
                <strong>Error:</strong>
                <div>
                  {schemaCompatibility.incompatibleReason.slice(0, 280)}
                  {schemaCompatibility.incompatibleReason.length > 280 ? "..." : ""}
                </div>
              </div>
            )}
          </div>
        )}

        {schemaCompatibility !== undefined && !schemaCompatibility.isCompatible && (
          <div style={{ marginTop: "-8rem", marginBottom: "12rem" }}>
            <strong>Details:</strong>
            <Pre>{schemaCompatibility.incompatibleReasonFull}</Pre>
          </div>
        )}

        <div className={s.FormControl}>
          <Button
            text='Create'
            type='primary'
            disabled={!schemaCompatibility?.isCompatible}
            onClick={async () => {
              const schemaInfo = new SchemaInfo();
              schemaInfo.setType(SchemaType[schema.type]);

              if (schemaShouldHaveDefinition && schema.definition !== undefined) {
                schemaInfo.setSchema(schema.definition);
              }

              const req = new CreateSchemaRequest();
              req.setTopic(topicFqn);
              req.setSchemaInfo(schemaInfo);

              const res = await schemaServiceClient.createSchema(req, {}).catch((err) => notifyError(`Unable to create schema. ${err}`));
              if (res === undefined) {
                return;
              }

              if (res.getStatus()?.getCode() === Code.OK) {
                props.onCreateSuccess();
                checkSchemaCompatibility();
                notifySuccess(`Schema successfully created.`);
              } else {
                notifyError(`Unable to create schema. ${res.getStatus()?.getMessage()}`);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

function isSchemaShouldHaveDefinition(schemaType: SchemaTypeT): boolean {
  return (
    schemaType === "SCHEMA_TYPE_PROTOBUF" ||
    schemaType === "SCHEMA_TYPE_PROTOBUF_NATIVE" ||
    schemaType === "SCHEMA_TYPE_AVRO" ||
    schemaType === "SCHEMA_TYPE_JSON" ||
    schemaType === "SCHEMA_TYPE_KEY_VALUE"
  );
}

export default CreateSchema;
