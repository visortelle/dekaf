import { SchemaType } from "../../../grpc-web/tools/teal/pulsar/ui/api/v1/schema_pb";

export type SchemaTypeT = keyof typeof SchemaType;
export const schemaTypes = Object.keys(SchemaType) as SchemaTypeT[];
