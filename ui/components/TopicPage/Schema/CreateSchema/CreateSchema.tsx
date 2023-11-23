import React, { useEffect, useState } from "react";
import {
  CreateKeyValueSchemaRequest,
  CreateSchemaRequest, KeyValueEncodingType,
  SchemaInfo,
  SchemaType,
  TestCompatibilityRequest,
} from "../../../../grpc-web/tools/teal/pulsar/ui/api/v1/schema_pb";
import Button from "../../../ui/Button/Button";
import {KeyValueSchema, KeyValueSchemaDefinition, SchemaDefinition, SchemaTypeT} from "../types";
import * as GrpcClient from "../../../app/contexts/GrpcClient/GrpcClient";
import * as Notifications from "../../../app/contexts/Notifications";
import s from "./CreateSchema.module.css";
import { Code } from "../../../../grpc-web/google/rpc/code_pb";
import SchemaTypeInput from "../SchemaTypeInput/SchemaTypeInput";
import { H1 } from "../../../ui/H/H";
import Policies from "../Policies/Policies";
import Pre from "../../../ui/Pre/Pre";
import HelpIcon from "../../../ui/ConfigurationTable/HelpIcon/HelpIcon";
import { PulsarTopicPersistency } from "../../../pulsar/pulsar-resources";
import SchemaEditor from "../SchemaEditor/SchemaEditor";

export type CreateSchemaProps = {
  topicPersistency: PulsarTopicPersistency;
  tenant: string;
  namespace: string;
  topic: string;
  isTopicHasAnySchema: boolean;
  defaultSchemaType: SchemaTypeT;
  defaultSchemaDefinition: SchemaDefinition | undefined;
  onCreateSuccess: () => void;
};

export type SchemaCompatibility = {
  isCompatible: boolean;
  strategy: string;
  incompatibleReason: string;
  incompatibleReasonFull: string;
};

export type SchemaForView = {
  type: SchemaTypeT;
  definition: Uint8Array | undefined;
  keyValueSchema?: KeyValueSchema,
  updateState: "in-progress" | "ready";
};

const CreateSchema: React.FC<CreateSchemaProps> = (props) => {
  const { schemaServiceClient } = GrpcClient.useContext();
  const { notifySuccess, notifyError } = Notifications.useContext();
  const topicFqn = `${props.topicPersistency}://${props.tenant}/${props.namespace}/${props.topic}`;

  const [schema, setSchema] = useState<SchemaForView>({
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
      schemaInfo.setSchema(schema.definition as Uint8Array);
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

    if (schema.updateState === "ready" && schema.type !== "SCHEMA_TYPE_KEY_VALUE") {
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
                <span className={s.ProtobufInfoHelpIconWrapper}>
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
              </span>
            </div>
          )}

          {schema.type === "SCHEMA_TYPE_KEY_VALUE" && (
            <div style={{ maxWidth: "480rem", color: "var(--accent-color-blue)" }}>
              <span>
                  At present, checking compatibility for <code>KEY_VALUE</code> schemas prior to creation is not available.
                  <br />
                  Additionally, retrieving the correct version of all but the latest <code>KEY_VALUE</code> schemas is currently not supported.
                  <br />
                  Stay tuned for updates!
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
          <SchemaEditor
            schemaType={schema.type}
            defaultSchemaDefinition={props.defaultSchemaDefinition}
            onSchemaDefinition={(v) => {
              if (v === undefined) {
                setSchema((schema) => ({ ...schema, definition: undefined, updateState: "in-progress" }));
                setSchemaCompatibility(undefined);
                return;
              }

              setSchema((schema) => ({ ...schema, definition: v, updateState: "ready" }));
            }}
            onKeyValueSchemaDefinition={(v) => {
              if (v?.keySchemaInfo?.getSchema_asU8() === undefined) {
                setSchema((schema) => ({ ...schema, keyValueSchema: undefined, updateState: "in-progress" }));
                setSchemaCompatibility(undefined);
                return;
              }

              if (v.valueSchemaInfo?.getSchema_asU8() === undefined) {
                setSchema((schema) => ({ ...schema, keyValueSchema: undefined, updateState: "in-progress" }));
                setSchemaCompatibility(undefined);
                return;
              }

              setSchema((schema) => ({ ...schema, keyValueSchema: v, updateState: "ready" }));
            }}
            onSchemaDefinitionError={() => {
              setSchema((schema) => ({ ...schema, definition: undefined, updateState: "in-progress" }));
              setSchemaCompatibility(undefined);
            }}
          />
        </div>

        {schemaCompatibility !== undefined && schema.type !== "SCHEMA_TYPE_KEY_VALUE" && (
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

        {schemaCompatibility !== undefined && !schemaCompatibility.isCompatible && schema.type !== "SCHEMA_TYPE_KEY_VALUE" && (
          <div style={{ marginTop: "-8rem", marginBottom: "12rem" }}>
            <strong>Details:</strong>
            <Pre>{schemaCompatibility.incompatibleReasonFull}</Pre>
          </div>
        )}

        <div className={s.FormControl}>
          <Button
            text='Create'
            type='primary'
            disabled={!schemaCompatibility?.isCompatible && schema.type !== "SCHEMA_TYPE_KEY_VALUE"}
            onClick={async () => {
              const createSchema = async (schemaDefinition: Uint8Array, schemaType: SchemaTypeT) => {
                const schemaInfo = new SchemaInfo();
                schemaInfo.setType(SchemaType[schemaType]);

                if (schemaShouldHaveDefinition && schema.definition !== undefined) {
                  schemaInfo.setSchema(schemaDefinition);
                }

                const req = new CreateSchemaRequest();
                req.setTopic(topicFqn);
                req.setSchemaInfo(schemaInfo);

                const res = await schemaServiceClient.createSchema(req, {})
                  .catch((err) => notifyError(`Unable to create schema. ${err}`));
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
              };

              const createKeyValueSchema = async (keyValueSchema: KeyValueSchema) => {
                const keySchemaInfo = new SchemaInfo();
                keySchemaInfo.setType(SchemaType[keyValueSchema.keyType]);

                const keySchemaShouldHaveDefinition = isSchemaShouldHaveDefinition(keyValueSchema.keyType);
                if (keySchemaShouldHaveDefinition) {
                  keySchemaInfo.setSchema(keyValueSchema.keySchemaInfo?.getSchema_asU8() || new Uint8Array());
                }

                const valueSchemaInfo = new SchemaInfo();
                valueSchemaInfo.setType(SchemaType[keyValueSchema.valueType]);

                const valueSchemaShouldHaveDefinition = isSchemaShouldHaveDefinition(keyValueSchema.valueType);
                if (valueSchemaShouldHaveDefinition) {
                  valueSchemaInfo.setSchema(keyValueSchema.valueSchemaInfo?.getSchema_asU8() || new Uint8Array());
                }

                const encodingTypePb = keyValueSchema.encodingType === "KEY_VALUE_ENCODING_TYPE_SEPARATED" ?
                  KeyValueEncodingType.KEY_VALUE_ENCODING_TYPE_SEPARATED :
                  KeyValueEncodingType.KEY_VALUE_ENCODING_TYPE_INLINE;

                const req = new CreateKeyValueSchemaRequest();
                req.setTopic(topicFqn);
                req.setKeySchemaInfo(keySchemaInfo);
                req.setValueSchemaInfo(valueSchemaInfo);
                req.setEncodingType(encodingTypePb);

                const res = await schemaServiceClient.createKeyValueSchema(req, {})
                  .catch((err) => notifyError(`Unable to create key value schema. ${err}`));

                if (res === undefined) {
                  return;
                }

                if (res.getStatus()?.getCode() === Code.OK) {
                  props.onCreateSuccess();

                  notifySuccess(`Schema successfully created.`);
                } else {
                  notifyError(`Unable to create schema. ${res.getStatus()?.getMessage()}`);
                }
              };

              if (schema.type === "SCHEMA_TYPE_KEY_VALUE" && schema.keyValueSchema !== undefined) {
                await createKeyValueSchema(schema.keyValueSchema);
              } else {
                await createSchema(schema.definition as Uint8Array, schema.type);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export function isSchemaShouldHaveDefinition(schemaType: SchemaTypeT): boolean {
  return (
    schemaType === "SCHEMA_TYPE_PROTOBUF" ||
    schemaType === "SCHEMA_TYPE_PROTOBUF_NATIVE" ||
    schemaType === "SCHEMA_TYPE_AVRO" ||
    schemaType === "SCHEMA_TYPE_JSON" ||
    schemaType === "SCHEMA_TYPE_KEY_VALUE"
  );
}

export default CreateSchema;
