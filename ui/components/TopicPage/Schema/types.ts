import {SchemaInfo, SchemaType} from "../../../grpc-web/tools/teal/pulsar/ui/api/v1/schema_pb";

export type SchemaTypeT = keyof typeof SchemaType;

export type SchemaDefinition = string | KeyValueSchemaDefinition;

export type KeyValueSchemaDefinition = {
  keyType: SchemaTypeT,
  keyDefinition: string | undefined,
  valueType: SchemaTypeT,
  valueDefinition: string | undefined,
  encodingType: KeyValueEncodingType,
}

export type KeyValueSchema = {
  keyType: SchemaTypeT,
  keySchemaInfo: SchemaInfo | undefined,
  valueType: SchemaTypeT,
  valueSchemaInfo: SchemaInfo | undefined,
  encodingType: KeyValueEncodingType,
  schemaVersion?: number,
}

export function isKeyValueSchemaDefinition(obj: any): obj is KeyValueSchemaDefinition {
  return obj
    && typeof obj.keyType === 'string'
    && typeof obj.keyDefinition === 'string'
    && typeof obj.valueType === 'string'
    && typeof obj.valueDefinition === 'string'
    && typeof obj.encodingType === 'string';
}


export type KeyValueEncodingType = "KEY_VALUE_ENCODING_TYPE_SEPARATED" | "KEY_VALUE_ENCODING_TYPE_INLINE";

export const schemaTypes = Object.keys(SchemaType) as SchemaTypeT[];
