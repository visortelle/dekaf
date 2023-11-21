import React, {useEffect, useState} from "react";
import useSWR, {mutate} from "swr";

import * as Modals from "../../app/contexts/Modals/Modals";
import * as GrpcClient from "../../app/contexts/GrpcClient/GrpcClient";
import * as Notifications from "../../app/contexts/Notifications";
import {
  DecodeKeyValueSchemaInfoRequest,
  GetLatestSchemaInfoRequest,
  KeyValueEncodingType as KeyValueEncodingTypePb,
  ListSchemasRequest,
  SchemaInfo,
  SchemaType,
} from "../../../grpc-web/tools/teal/pulsar/ui/api/v1/schema_pb";
import {Code} from "../../../grpc-web/google/rpc/code_pb";
import CreateSchema from "./CreateSchema/CreateSchema";
import {
  KeyValueEncodingType,
  KeyValueSchema,
  KeyValueSchemaDefinition,
  SchemaDefinition,
  schemaTypes,
  SchemaTypeT
} from "./types";
import SmallButton from "../../ui/SmallButton/SmallButton";
import {swrKeys} from "../../swrKeys";
import SchemaEntry from "./SchemaEntry/SchemaEntry";
import DeleteDialog from "./DeleteDialog/DeleteDialog";
import {routes} from "../../routes";
import Link from "../../ui/Link/Link";

import s from "./Schema.module.css";
import {useNavigate} from "react-router";
import {PulsarTopicPersistency} from "../../pulsar/pulsar-resources";

export type SchemaProps = {
  tenant: string;
  namespace: string;
  topic: string;
  topicPersistency: PulsarTopicPersistency;
  view: View;
};

export type View = { type: "initial-screen" } | { type: "create-schema" } | { type: "view-schema"; schemaVersion: number };

const Schema: React.FC<SchemaProps> = (props) => {
  const [defaultNewSchemaType, setDefaultNewSchemaType] = useState<SchemaTypeT>("SCHEMA_TYPE_NONE");
  const [defaultSchemaDefinition, setDefaultSchemaDefinition] = useState<SchemaDefinition | undefined>(undefined);
  const [keyValueSchema, setKeyValueSchema] = useState<KeyValueSchema | undefined>(undefined);

  const { schemaServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const modals = Modals.useContext();
  const navigate = useNavigate();

  const topicFqn = `${props.topicPersistency}://${props.tenant}/${props.namespace}/${props.topic}`;

  const {
    data: latestSchemaInfo,
    error: latestSchemaInfoError,
    isLoading: isLatestSchemaInfoLoading,
  } = useSWR(swrKeys.pulsar.schemas.getLatestSchemaInfo._(topicFqn), async () => {
    const req = new GetLatestSchemaInfoRequest();
    req.setTopic(topicFqn);

    const res = await schemaServiceClient.getLatestSchemaInfo(req, {});
    if (res.getStatus()?.getCode() === Code.OK) {
      return res;
    }
  });

  if (latestSchemaInfoError !== undefined) {
    notifyError(`Unable to get latest schema info. ${latestSchemaInfoError}`);
  }

  if (latestSchemaInfo !== undefined && latestSchemaInfo.getStatus()?.getCode() !== Code.OK) {
    notifyError(`Unable to get latest schema info. ${latestSchemaInfo?.getStatus()?.getMessage()}`);
  }

  const { data: schemas, error: schemasError } = useSWR(swrKeys.pulsar.schemas.listSchemas._(topicFqn), async () => {
    const req = new ListSchemasRequest();
    req.setTopic(topicFqn);
    return await schemaServiceClient.listSchemas(req, {});
  });

  if (schemasError !== undefined) {
    notifyError(`Unable to get schemas. ${schemasError}`);
  }

  if (schemas !== undefined && schemas.getStatus()?.getCode() !== Code.OK) {
    notifyError(`Unable to get schemas. ${schemas?.getStatus()?.getMessage()}`);
  }

  const decodeKeyValueSchema = async (schemaInfo: SchemaInfo, schemaVersion?: number) => {
    const req = new DecodeKeyValueSchemaInfoRequest();
    req.setKeyValueSchemaInfo(schemaInfo);

    const res = await schemaServiceClient.decodeKeyValueSchemaInfo(req, {})
      .catch((err) => notifyError(err));

    if (res === undefined) {
      return;
    }
    if(res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to decode key-value schema info. ${res.getStatus()?.getMessage()}`);
      return;
    }

    const keySchemaInfo = res.getKeySchemaInfo();
    const valueSchemaInfo = res.getValueSchemaInfo();
    const keyValueEncodingType: KeyValueEncodingType = res.getEncodingType() === KeyValueEncodingTypePb.KEY_VALUE_ENCODING_TYPE_SEPARATED ?
      "KEY_VALUE_ENCODING_TYPE_SEPARATED" :
      "KEY_VALUE_ENCODING_TYPE_INLINE";

    return {
      keyType: keySchemaInfo?.getType() ? schemaTypes[keySchemaInfo.getType()] : "SCHEMA_TYPE_UNSPECIFIED",
      keySchemaInfo: keySchemaInfo,
      valueType: valueSchemaInfo?.getType() ? schemaTypes[valueSchemaInfo.getType()] : "SCHEMA_TYPE_UNSPECIFIED",
      valueSchemaInfo: valueSchemaInfo,
      encodingType: keyValueEncodingType,
      schemaVersion: schemaVersion
    } as KeyValueSchema;
  }

  useEffect(() => {
    if (isLatestSchemaInfoLoading) {
      return;
    }

    const schemaInfo = latestSchemaInfo?.getSchemaInfoWithVersion()?.getSchemaInfo();

    if (latestSchemaInfo !== undefined && latestSchemaInfo.getStatus()?.getCode() === Code.OK) {
      const schemaInfo = latestSchemaInfo?.getSchemaInfoWithVersion()?.getSchemaInfo();
      const schemaVersion = latestSchemaInfo?.getSchemaInfoWithVersion()?.getSchemaVersion() || -1;
      if (schemaInfo !== undefined) {
        const schemaType = (Object.entries(SchemaType).find(([, i]) => i === schemaInfo.getType()) || [])[0] as SchemaTypeT;
        if (schemaType !== undefined) {
          setDefaultNewSchemaType(schemaType);
        }
        if (schemaType === "SCHEMA_TYPE_AVRO" || schemaType === "SCHEMA_TYPE_JSON" || schemaType === "SCHEMA_TYPE_PROTOBUF") {
          setDefaultSchemaDefinition(schemaInfo?.getSchema_asU8() ? (
            Array.from(schemaInfo.getSchema_asU8())
              .map((b) => String.fromCharCode(b))
              .join("")
          ) : undefined);
        }
        if (schemaType === "SCHEMA_TYPE_KEY_VALUE") {
          decodeKeyValueSchema(schemaInfo, schemaVersion).then(r => setKeyValueSchema(r));
        }
      }
    }

    // Redirect to the "Create schema" page if there is no schema.
    if (props.view.type === "initial-screen" && schemaInfo === undefined) {
      navigate(
        routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.schema.create._.get({
          tenant: props.tenant,
          namespace: props.namespace,
          topic: props.topic,
          topicPersistency: props.topicPersistency,
        }),
      );
      return;
    }

    // Redirect to the "View schema" page if there is a schema.
    if (props.view.type === "initial-screen" && schemaInfo !== undefined) {
      const schemaVersion = latestSchemaInfo?.getSchemaInfoWithVersion()?.getSchemaVersion();
      if (schemaVersion === undefined) {
        return;
      }

      navigate(
        routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.schema.view._.get({
          tenant: props.tenant,
          namespace: props.namespace,
          topic: props.topic,
          topicPersistency: props.topicPersistency,
          schemaVersion,
        }),
      );
      return;
    }
  }, [latestSchemaInfo, props.view]);

  useEffect(() => {
    const newDefaultSchemaDefinition = (keyValueSchema?.keySchemaInfo?.getSchema_asU8() || keyValueSchema?.valueSchemaInfo?.getSchema_asU8()) ? (
      {
        keyType: keyValueSchema?.keySchemaInfo?.getType() ? schemaTypes[keyValueSchema?.keySchemaInfo.getType()] : "SCHEMA_TYPE_UNSPECIFIED",
        keyDefinition: Array.from(keyValueSchema?.keySchemaInfo?.getSchema_asU8() || new Uint8Array()).map((b) => String.fromCharCode(b)).join(""),
        valueType: keyValueSchema?.valueSchemaInfo?.getType() ? schemaTypes[keyValueSchema?.valueSchemaInfo.getType()] : "SCHEMA_TYPE_UNSPECIFIED",
        valueDefinition: Array.from(keyValueSchema?.valueSchemaInfo?.getSchema_asU8() || new Uint8Array()).map((b) => String.fromCharCode(b)).join(""),
        encodingType: keyValueSchema?.encodingType || "KEY_VALUE_ENCODING_TYPE_INLINE",
      } as KeyValueSchemaDefinition
    ) : undefined;

    setDefaultSchemaDefinition(newDefaultSchemaDefinition);
  }, [keyValueSchema]);

  const refetchData = async () => {
    await mutate(swrKeys.pulsar.schemas.getLatestSchemaInfo._(topicFqn), undefined, { revalidate: true });
    await mutate(swrKeys.pulsar.schemas.listSchemas._(topicFqn), undefined, { revalidate: true });
  };

  return (
    <div className={s.Schema} key={`${defaultNewSchemaType}-${defaultSchemaDefinition}`}>
      <div className={s.Schemas}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8rem 12rem",
            borderBottom: "1px solid var(--border-color)",
          }}
        >
          <div style={{ display: "flex", marginRight: "12rem", flex: "0 1 auto", justifyContent: "center" }}>
            <Link
              isNormalizeStyle
              to={routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.schema.create._.get({
                tenant: props.tenant,
                namespace: props.namespace,
                topic: props.topic,
                topicPersistency: props.topicPersistency,
              })}
            >
              <SmallButton text='New Schema' type='primary' onClick={() => { }} />
            </Link>
          </div>
          <div>
            <SmallButton
              text='Delete'
              type='danger'
              disabled={schemas === undefined ? true : schemas?.getSchemasList().length === 0}
              testId='schema-delete-button'
              onClick={() =>
                modals.push({
                  id: "delete-schema",
                  title: `Delete schema`,
                  content: (
                    <DeleteDialog
                      topicPersistency={props.topicPersistency}
                      topic={props.topic}
                      namespace={props.namespace}
                      tenant={props.tenant}
                      refetchData={refetchData}
                    />
                  ),
                  styleMode: "no-content-padding",
                })
              }
            />
          </div>
        </div>

        <div className={s.SchemaList}>
          {schemas?.getSchemasList().length === 0 && <div style={{ padding: "8rem 12rem" }}>No schemas registered for this topic.</div>}
          {schemas
            ?.getSchemasList()
            .sort((a, b) => b.getSchemaVersion() - a.getSchemaVersion())
            .map((schema) => {
              const schemaInfo = schema.getSchemaInfo();
              const schemaVersion = schema.getSchemaVersion();
              if (schemaInfo === undefined) {
                return null;
              }

              return (
                <Link
                  key={schemaVersion}
                  isNormalizeStyle
                  to={routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.schema.view._.get({
                    topicPersistency: props.topicPersistency,
                    tenant: props.tenant,
                    namespace: props.namespace,
                    topic: props.topic,
                    schemaVersion,
                  })}
                >
                  <SchemaListEntry
                    schemaInfo={schemaInfo}
                    version={schemaVersion}
                    isSelected={props.view.type === "view-schema" && props.view.schemaVersion === schemaVersion}
                    onClick={() => undefined}
                  />
                </Link>
              );
            })}
        </div>
      </div>
      {schemas !== undefined && (
        <div className={s.Content}>
          {props.view.type === "create-schema" && (
            <CreateSchema
              topicPersistency={props.topicPersistency}
              tenant={props.tenant}
              namespace={props.namespace}
              topic={props.topic}
              isTopicHasAnySchema={(schemas.getSchemasList().length || 0) > 0}
              defaultSchemaType={defaultNewSchemaType}
              defaultSchemaDefinition={defaultSchemaDefinition}
              onCreateSuccess={async () => {
                await refetchData();
                navigate(
                  routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.schema._.get({
                    topicPersistency: props.topicPersistency,
                    tenant: props.tenant,
                    namespace: props.namespace,
                    topic: props.topic,
                  }),
                );
              }}
            />
          )}
          {props.view.type === "view-schema" &&
            (() => {
              const schemaInfo = schemas
                .getSchemasList()
                .find((s) => {
                  if (props.view.type === "view-schema") {
                    return s.getSchemaVersion() === props.view.schemaVersion;
                  }
                })
                ?.getSchemaInfo();

              if (schemaInfo === undefined) {
                return <></>;
              }

              return (
                keyValueSchema !== undefined && schemaInfo.getType() == SchemaType.SCHEMA_TYPE_KEY_VALUE ? (
                  <SchemaEntry
                    key={`${topicFqn}/schemas/${props.view.schemaVersion}`}
                    topic={topicFqn}
                    schemaVersion={props.view.schemaVersion}
                    keyValueSchema={keyValueSchema}
                    view={props.view}
                  />
                ) : (
                  <SchemaEntry
                    key={`${topicFqn}/schemas/${props.view.schemaVersion}`}
                    topic={topicFqn}
                    schemaVersion={props.view.schemaVersion}
                    schemaInfo={schemaInfo}
                    view={props.view}
                  />
                )
              );
            })()}
        </div>
      )}
    </div>
  );
};

type SchemaListEntryProps = {
  schemaInfo: SchemaInfo;
  version: number;
  isSelected: boolean;
  onClick: () => void;
};
const SchemaListEntry: React.FC<SchemaListEntryProps> = (props) => {
  return (
    <div className={`${s.SchemaListEntry} ${props.isSelected ? s.SchemaListEntrySelected : ""}`} onClick={props.onClick}>
      <div>
        <strong>Version:</strong> {props.schemaInfo.getType() === SchemaType.SCHEMA_TYPE_KEY_VALUE ? "-" : props.version}
      </div>
      <div>
        <strong>Type:</strong> {schemaTypes[props.schemaInfo.getType()].replace("SCHEMA_TYPE_", "")}
      </div>
    </div>
  );
};

export default Schema;
