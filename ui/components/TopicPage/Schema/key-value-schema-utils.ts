import {
  DecodeKeyValueSchemaInfoRequest,
  KeyValueEncodingType as KeyValueEncodingTypePb,
  SchemaInfo
} from "../../../grpc-web/tools/teal/pulsar/ui/api/v1/schema_pb";
import {Code} from "../../../grpc-web/google/rpc/code_pb";
import {KeyValueEncodingType, KeyValueSchema, schemaTypes} from "./types";
import {SchemaServiceClient} from "../../../grpc-web/tools/teal/pulsar/ui/api/v1/SchemaServiceClientPb";
import {ReactNode} from "react";

export const decodeKeyValueSchema = async (
  schemaInfo: SchemaInfo,
  schemaServiceClient: SchemaServiceClient,
  notifyError: (content: ReactNode, notificationId?: string, isShort?: boolean) => void,
  schemaVersion?: number,
) => {
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
};