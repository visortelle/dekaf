import React, {useEffect, useMemo, useState} from "react";
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
import HelpIcon from "../../ui/ConfigurationTable/HelpIcon/HelpIcon";
import {decodeKeyValueSchema} from "./key-value-schema-utils";

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

  const sortedSchemas = useMemo(() => {
    return schemas?.getSchemasList().sort((a, b) => b.getSchemaVersion() - a.getSchemaVersion())
  }, [schemas]);

  useEffect(() => {
    if (isLatestSchemaInfoLoading) {
      return;
    }

    const schemaInfo = latestSchemaInfo?.getSchemaInfoWithVersion()?.getSchemaInfo();

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
    if (isLatestSchemaInfoLoading) {
      return;
    }

    const schemaInfo = latestSchemaInfo?.getSchemaInfoWithVersion()?.getSchemaInfo();

    if (latestSchemaInfo !== undefined && latestSchemaInfo.getStatus()?.getCode() === Code.OK) {
      const schemaInfo = latestSchemaInfo?.getSchemaInfoWithVersion()?.getSchemaInfo();
      const schemaVersion = latestSchemaInfo?.getSchemaInfoWithVersion()?.getSchemaVersion() || -1;
      if (schemaInfo !== undefined) {
        const schemaTypeT = schemaTypes[schemaInfo.getType()];

        if (schemaTypeT !== undefined) {
          setDefaultNewSchemaType(schemaTypeT);
        }

        if (schemaTypeT === "SCHEMA_TYPE_AVRO" || schemaTypeT === "SCHEMA_TYPE_JSON" || schemaTypeT === "SCHEMA_TYPE_PROTOBUF") {
          setDefaultSchemaDefinition(schemaInfo?.getSchema_asU8() ? (
            Array.from(schemaInfo.getSchema_asU8())
              .map((b) => String.fromCharCode(b))
              .join("")
          ) : undefined);
        }

        if (schemaTypeT === "SCHEMA_TYPE_KEY_VALUE") {
          decodeKeyValueSchema(schemaInfo, schemaServiceClient, notifyError, schemaVersion).then(schema => {
            const newDefaultSchemaDefinition = (schema?.keySchemaInfo?.getSchema_asU8() || s.valueSchemaInfo?.getSchema_asU8()) ? (
              {
                keyType: schema?.keySchemaInfo?.getType() ? schemaTypes[schema?.keySchemaInfo.getType()] : "SCHEMA_TYPE_UNSPECIFIED",
                keyDefinition: Array.from(schema?.keySchemaInfo?.getSchema_asU8() || new Uint8Array()).map((b) => String.fromCharCode(b)).join(""),
                valueType: schema?.valueSchemaInfo?.getType() ? schemaTypes[schema?.valueSchemaInfo.getType()] : "SCHEMA_TYPE_UNSPECIFIED",
                valueDefinition: Array.from(schema?.valueSchemaInfo?.getSchema_asU8() || new Uint8Array()).map((b) => String.fromCharCode(b)).join(""),
                encodingType: schema?.encodingType || "KEY_VALUE_ENCODING_TYPE_INLINE",
              } as KeyValueSchemaDefinition
            ) : undefined;

            setDefaultSchemaDefinition(newDefaultSchemaDefinition);
          });
        }
      }
    }
  }, [latestSchemaInfo]);

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
          {sortedSchemas
            ?.map((schema) => {
              const schemaInfo = schema.getSchemaInfo();
              const schemaVersion = schema.getSchemaVersion();
              if (schemaInfo === undefined) {
                return null;
              }

              const sortedSchemas = schemas?.getSchemasList().sort((a, b) => b.getSchemaVersion() - a.getSchemaVersion())
              if (sortedSchemas?.at(0) !== schema && schemaTypes[schema.getSchemaInfo()?.getType()!] == "SCHEMA_TYPE_KEY_VALUE" ) {
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
                      version={`${schemaVersion} ± X`}
                      isOldKeyValueSchema={true}
                      isSelected={props.view.type === "view-schema" && props.view.schemaVersion === schemaVersion}
                      onClick={() => undefined}
                    />
                  </Link>
                );
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

              const sortedSchemaInfos = sortedSchemas?.map(s => s.getSchemaInfo());
              if (sortedSchemaInfos?.at(0) &&
                sortedSchemaInfos?.at(0) !== schemaInfo &&
                schemaTypes[schemaInfo?.getType()!] == "SCHEMA_TYPE_KEY_VALUE") {
                return (
                  <SchemaEntry
                    key={`${topicFqn}/schemas/${props.view.schemaVersion}`}
                    topic={topicFqn}
                    schemaInfo={schemaInfo}
                    schemaVersion={props.view.schemaVersion}
                    isKeyValueSchema={schemaTypes[schemaInfo.getType()] == "SCHEMA_TYPE_KEY_VALUE"}
                    view={props.view}
                    isOldKeyValueSchema={true}
                  />
                );
              }

              return (
                <SchemaEntry
                  key={`${topicFqn}/schemas/${props.view.schemaVersion}`}
                  topic={topicFqn}
                  schemaInfo={schemaInfo}
                  schemaVersion={props.view.schemaVersion}
                  isKeyValueSchema={schemaTypes[schemaInfo.getType()] == "SCHEMA_TYPE_KEY_VALUE"}
                  view={props.view}
                />
              );
            })()}
        </div>
      )}
    </div>
  );
};

type SchemaListEntryProps = {
  schemaInfo: SchemaInfo;
  version: number | string;
  isSelected: boolean;
  isOldKeyValueSchema?: boolean;
  onClick: () => void;
};
const SchemaListEntry: React.FC<SchemaListEntryProps> = (props) => {
  return (
    <div className={`${s.SchemaListEntry} ${props.isSelected ? s.SchemaListEntrySelected : ""}`} onClick={props.onClick}>
      <div className={s.SchemaListEntryVersionWrapper}>
        <strong>Version:</strong> &nbsp;
        <span>{props.version}</span>
        {props.isOldKeyValueSchema &&
          <span style={{marginLeft: "auto"}}>
            <HelpIcon
              help={
                <div>
                  Retrieving the correct version of all but the latest <code>KEY_VALUE</code> schemas is currently not supported.
                  <br/>
                  For ease of use, we display an approximate version of the KEY_VALUE schema, where <code>X</code> represents the potential deviation in versions.
                </div>
              }
            />
          </span>
        }
      </div>
      <div>
        <strong>Type:</strong> {schemaTypes[props.schemaInfo.getType()].replace("SCHEMA_TYPE_", "")}
      </div>
    </div>
  );
};

export default Schema;
