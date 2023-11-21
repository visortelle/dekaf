import {
  isKeyValueSchemaDefinition,
  KeyValueSchema,
  KeyValueSchemaDefinition,
  SchemaDefinition,
  SchemaTypeT
} from "../types";
import ProtobufNativeEditor from "../ProtobufNativeEditor/ProtobufNativeEditor";
import s from "./SchemaEditor.module.css";
import React from "react";
import AvroEditor from "../AvroEditor/AvroEditor";
import KeyValueSchemaEditor from "../KeyValueSchemaEditor/KeyValueSchemaEditor";

type SchemaEditorProps = {
  schemaType: SchemaTypeT,
  onSchemaDefinition: (schemaPayload: Uint8Array | undefined) => void,
  onKeyValueSchemaDefinition?: (schemaPayload: KeyValueSchema | undefined) => void,
  onSchemaDefinitionError: () => void,
  defaultSchemaDefinition: SchemaDefinition | undefined,
  withoutKeyValueEditor?: boolean,
}

const SchemaEditor: React.FC<SchemaEditorProps> = (props) => {
  const keyValueDefaultDefinition: KeyValueSchemaDefinition | undefined =
    isKeyValueSchemaDefinition(props.defaultSchemaDefinition)
      ? props.defaultSchemaDefinition
      : undefined;

  const defaultSchemaDefinition =
    !isKeyValueSchemaDefinition(props.defaultSchemaDefinition)
      ? props.defaultSchemaDefinition
      : undefined;

  return (
    <div>
      {props.schemaType === "SCHEMA_TYPE_KEY_VALUE" && !props.withoutKeyValueEditor && props.onKeyValueSchemaDefinition !== undefined && (
        <div className={s.FormControl}>
          <KeyValueSchemaEditor
            onSchemaDefinition={props.onKeyValueSchemaDefinition}
            onSchemaDefinitionError={props.onSchemaDefinitionError}
            defaultKeyValueSchemaDefinition={keyValueDefaultDefinition}
          />
        </div>
      )}
      {props.schemaType === "SCHEMA_TYPE_PROTOBUF_NATIVE" && (
        // https://github.com/apache/pulsar/blob/c01b1eeda3221bdbf863bf0f3f8373e93d90adef/pulsar-client/src/test/java/org/apache/pulsar/client/impl/schema/ProtobufNativeSchemaTest.java
        // fileDescriptorSet: "CtMDCgpUZXN0LnByb3RvEgVwcm90bxoSRXh0ZXJuYWxUZXN0LnByb3RvImUKClN1Yk1lc3NhZ2USCwoDZm9vGAEgASgJEgsKA2JhchgCIAEoARo9Cg1OZXN0ZWRNZXNzYWdlEgsKA3VybBgBIAEoCRINCgV0aXRsZRgCIAEoCRIQCghzbmlwcGV0cxgDIAMoCSLlAQoLVGVzdE1lc3NhZ2USEwoLc3RyaW5nRmllbGQYASABKAkSEwoLZG91YmxlRmllbGQYAiABKAESEAoIaW50RmllbGQYBiABKAUSIQoIdGVzdEVudW0YBCABKA4yDy5wcm90by5UZXN0RW51bRImCgtuZXN0ZWRGaWVsZBgFIAEoCzIRLnByb3RvLlN1Yk1lc3NhZ2USFQoNcmVwZWF0ZWRGaWVsZBgKIAMoCRI4Cg9leHRlcm5hbE1lc3NhZ2UYCyABKAsyHy5wcm90by5leHRlcm5hbC5FeHRlcm5hbE1lc3NhZ2UqJAoIVGVzdEVudW0SCgoGU0hBUkVEEAASDAoIRkFJTE9WRVIQAUItCiVvcmcuYXBhY2hlLnB1bHNhci5jbGllbnQuc2NoZW1hLnByb3RvQgRUZXN0YgZwcm90bzMKoAEKEkV4dGVybmFsVGVzdC5wcm90bxIOcHJvdG8uZXh0ZXJuYWwiOwoPRXh0ZXJuYWxNZXNzYWdlEhMKC3N0cmluZ0ZpZWxkGAEgASgJEhMKC2RvdWJsZUZpZWxkGAIgASgBQjUKJW9yZy5hcGFjaGUucHVsc2FyLmNsaWVudC5zY2hlbWEucHJvdG9CDEV4dGVybmFsVGVzdGIGcHJvdG8z"
        // rootFileDescriptorName: "Test.proto"
        // rootMessageTypeName: "proto.TestMessage"
        <div className={s.FormControl}>
          <ProtobufNativeEditor
            onSchemaDefinition={props.onSchemaDefinition}
            onSchemaDefinitionError={props.onSchemaDefinitionError}
          />
        </div>
      )}

      {(props.schemaType === "SCHEMA_TYPE_AVRO" || props.schemaType === "SCHEMA_TYPE_JSON" || props.schemaType === "SCHEMA_TYPE_PROTOBUF") && (
        <div className={s.FormControl}>
          <AvroEditor
            key={props.schemaType}
            defaultSchemaDefinition={defaultSchemaDefinition}
            onSchemaDefinition={props.onSchemaDefinition}
          />
        </div>
      )}

    </div>
  )
}

export default SchemaEditor;