import React, { useEffect, useState } from "react";
import useSWR, { mutate } from "swr";

import * as Modals from "../../app/contexts/Modals/Modals";
import * as GrpcClient from "../../app/contexts/GrpcClient/GrpcClient";
import * as Notifications from "../../app/contexts/Notifications";
import {
  GetLatestSchemaInfoRequest,
  ListSchemasRequest,
  SchemaInfo,
  SchemaType,
} from "../../../grpc-web/tools/teal/pulsar/ui/api/v1/schema_pb";
import { Code } from "../../../grpc-web/google/rpc/code_pb";
import CreateSchema from "./CreateSchema/CreateSchema";
import { schemaTypes, SchemaTypeT } from "./types";
import SmallButton from "../../ui/SmallButton/SmallButton";
import { swrKeys } from "../../swrKeys";
import SchemaEntry from "./SchemaEntry/SchemaEntry";
import DeleteDialog from "./DeleteDialog/DeleteDialog";
import { routes } from "../../routes";
import Link from "../../ui/Link/Link";

import s from "./Schema.module.css";
import { useNavigate } from "react-router";

export type SchemaProps = {
  tenant: string;
  namespace: string;
  topic: string;
  topicType: "persistent" | "non-persistent";
  view: View;
};

export type View = { type: "initial-screen" } | { type: "create-schema" } | { type: "view-schema"; schemaVersion: number };

const Schema: React.FC<SchemaProps> = (props) => {
  const [defaultNewSchemaType, setDefaultNewSchemaType] = useState<SchemaTypeT>("SCHEMA_TYPE_NONE");
  const [defaultSchemaDefinition, setDefaultSchemaDefinition] = useState<string | undefined>(undefined);

  const { schemaServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const modals = Modals.useContext();
  const navigate = useNavigate();

  const topicFqn = `${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`;

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

  useEffect(() => {
    if (isLatestSchemaInfoLoading) {
      return;
    }

    const schemaInfo = latestSchemaInfo?.getSchemaInfo();

    if (latestSchemaInfo !== undefined && latestSchemaInfo.getStatus()?.getCode() === Code.OK) {
      const schemaInfo = latestSchemaInfo.getSchemaInfo();
      if (schemaInfo !== undefined) {
        const schemaType = (Object.entries(SchemaType).find(([, i]) => i === schemaInfo.getType()) || [])[0] as SchemaTypeT;
        if (schemaType !== undefined) {
          setDefaultNewSchemaType(schemaType);
        }
        if (schemaType === "SCHEMA_TYPE_AVRO" || schemaType === "SCHEMA_TYPE_JSON" || schemaType === "SCHEMA_TYPE_PROTOBUF") {
          setDefaultSchemaDefinition(() =>
            Array.from(schemaInfo.getSchema_asU8())
              .map((b) => String.fromCharCode(b))
              .join(""),
          );
        }
      }
    }

    // Redirect to the "Create schema" page if there is no schema.
    if (props.view.type === "initial-screen" && schemaInfo === undefined) {
      navigate(
        routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.schema.create._.get({
          tenant: props.tenant,
          namespace: props.namespace,
          topic: props.topic,
          topicType: props.topicType,
        }),
      );
      return;
    }

    // Redirect to the "View schema" page if there is a schema.
    if (props.view.type === "initial-screen" && schemaInfo !== undefined) {
      const schemaVersion = latestSchemaInfo?.getSchemaVersion();
      if (schemaVersion === undefined) {
        return;
      }

      navigate(
        routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.schema.view._.get({
          tenant: props.tenant,
          namespace: props.namespace,
          topic: props.topic,
          topicType: props.topicType,
          schemaVersion,
        }),
      );
      return;
    }
  }, [latestSchemaInfo, props.view]);

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
              to={routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.schema.create._.get({
                tenant: props.tenant,
                namespace: props.namespace,
                topic: props.topic,
                topicType: props.topicType,
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
                      topicType={props.topicType}
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
                  to={routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.schema.view._.get({
                    topicType: props.topicType,
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
              topicType={props.topicType}
              tenant={props.tenant}
              namespace={props.namespace}
              topic={props.topic}
              isTopicHasAnySchema={(schemas.getSchemasList().length || 0) > 0}
              defaultSchemaType={defaultNewSchemaType}
              defaultSchemaDefinition={defaultSchemaDefinition}
              onCreateSuccess={async () => {
                await refetchData();
                navigate(
                  routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.schema._.get({
                    topicType: props.topicType,
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
                <SchemaEntry
                  key={`${topicFqn}/schemas/${props.view.schemaVersion}`}
                  topic={topicFqn}
                  schemaVersion={props.view.schemaVersion}
                  schemaInfo={schemaInfo}
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
  version: number;
  isSelected: boolean;
  onClick: () => void;
};
const SchemaListEntry: React.FC<SchemaListEntryProps> = (props) => {
  return (
    <div className={`${s.SchemaListEntry} ${props.isSelected ? s.SchemaListEntrySelected : ""}`} onClick={props.onClick}>
      <div>
        <strong>Version:</strong> {props.version}
      </div>
      <div>
        <strong>Type:</strong> {schemaTypes[props.schemaInfo.getType()].replace("SCHEMA_TYPE_", "")}
      </div>
    </div>
  );
};

export default Schema;
