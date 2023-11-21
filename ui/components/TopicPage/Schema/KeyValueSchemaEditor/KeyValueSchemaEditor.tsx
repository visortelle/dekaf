import s from "../AvroEditor/AvroEditor.module.css";
import Select from "../../../ui/Select/Select";
import React from "react";
import {
  KeyValueSchemaDefinition,
  KeyValueEncodingType,
  SchemaTypeT,
  KeyValueSchema
} from "../types";
import SchemaTypeInput from "../SchemaTypeInput/SchemaTypeInput";
import SchemaEditor from "../SchemaEditor/SchemaEditor";
import {isSchemaShouldHaveDefinition, SchemaForView} from "../CreateSchema/CreateSchema";
import {
  SchemaInfo,
  SchemaType
} from "../../../../grpc-web/tools/teal/pulsar/ui/api/v1/schema_pb";

type KeyValueSchemaEditorProps = {
  onSchemaDefinition: (schemaPayload: KeyValueSchema | undefined) => void,
  onSchemaDefinitionError: () => void
  defaultKeyValueSchemaDefinition: KeyValueSchemaDefinition | undefined
}

const KeyValueSchemaEditor: React.FC<KeyValueSchemaEditorProps> = (props) => {
  const keySchemaType: SchemaTypeT = props.defaultKeyValueSchemaDefinition?.keyType || "SCHEMA_TYPE_NONE";
  const valueSchemaType: SchemaTypeT = props.defaultKeyValueSchemaDefinition?.valueType || "SCHEMA_TYPE_NONE";
  const keySchemaByteDefinition = new Uint8Array(props.defaultKeyValueSchemaDefinition?.keyDefinition?.split('').map((ch) => ch.charCodeAt(0)) || []);
  const valueSchemaByteDefinition = new Uint8Array(props.defaultKeyValueSchemaDefinition?.valueDefinition?.split('').map((ch) => ch.charCodeAt(0)) || []);
  const keyUpdateState = isSchemaShouldHaveDefinition(keySchemaType) && keySchemaByteDefinition.length == 0 ? "in-progress" : "ready";
  const valueUpdateState = isSchemaShouldHaveDefinition(valueSchemaType) && valueSchemaByteDefinition.length == 0 ? "in-progress" : "ready";
  const keyValueSchemaEncodingType = props.defaultKeyValueSchemaDefinition?.encodingType || "KEY_VALUE_ENCODING_TYPE_INLINE";

  const [keySchema, setKeySchema] = React.useState<SchemaForView>({
    type: keySchemaType,
    definition: keySchemaByteDefinition,
    updateState: keyUpdateState,
  });
  const [valueSchema, setValueSchema] = React.useState<SchemaForView>({
    type: valueSchemaType,
    definition: valueSchemaByteDefinition,
    updateState: valueUpdateState,
  });
  const [keyValueEncodingType, setKeyValueEncodingType] = React.useState<KeyValueEncodingType>(keyValueSchemaEncodingType);

  const handleSchemaDefinition = async () => {
    if (keySchema.updateState === "in-progress" || valueSchema.updateState === "in-progress") {
      return;
    }

    const keySchemaDefinition = keySchema.definition;
    const valueSchemaDefinition = valueSchema.definition;

    if (isSchemaShouldHaveDefinition(keySchema.type) && keySchemaDefinition === undefined) {
      props.onSchemaDefinitionError();
      return;
    }
    if (isSchemaShouldHaveDefinition(valueSchema.type) && valueSchemaDefinition === undefined) {
      props.onSchemaDefinitionError();
      return;
    }

    const keySchemaInfo = new SchemaInfo();

    if (isSchemaShouldHaveDefinition(keySchema.type) && keySchema.definition !== undefined) {
      keySchemaInfo.setSchema(keySchema.definition as Uint8Array);
    }
    keySchemaInfo.setType(SchemaType[keySchema.type]);

    const valueSchemaInfo = new SchemaInfo();

    if (isSchemaShouldHaveDefinition(valueSchema.type) && valueSchema.definition !== undefined) {
      valueSchemaInfo.setSchema(valueSchema.definition as Uint8Array);
    }
    valueSchemaInfo.setType(SchemaType[valueSchema.type]);

    props.onSchemaDefinition(
      {
        keyType: keySchema.type,
        keySchemaInfo: keySchemaInfo,
        valueType: valueSchema.type,
        valueSchemaInfo: valueSchemaInfo,
        encodingType: keyValueEncodingType,
      } as KeyValueSchema
    );
  }

  React.useEffect( () => {
    handleSchemaDefinition();

  }, [JSON.stringify(keySchema), JSON.stringify(valueSchema), keyValueEncodingType]);

  return (
    <div>
      <div className={s.FormControl}>
        <strong>Key Value Encoding Type</strong>
        <Select<KeyValueEncodingType>
          value={keyValueEncodingType}
          onChange={(v) => setKeyValueEncodingType(v)}
          list={[
            { type: 'item', value: "KEY_VALUE_ENCODING_TYPE_INLINE", title: "INLINE" },
            { type: 'item', value: "KEY_VALUE_ENCODING_TYPE_SEPARATED", title: "SEPARATED" },
          ]}
        />
      </div>
      <div>
        <div className={s.FormControl}>
          <strong>Key Schema</strong>
          <SchemaTypeInput
            value={keySchema.type}
            onChange={(v) => {
              setKeySchema((schema) => {
                return {
                  ...schema,
                  type: v,
                  updateState: isSchemaShouldHaveDefinition(v) ? "in-progress" : "ready",
                };
              });
            }}
            withoutKeyValue={true}
          />
        </div>
        <div className={s.FormControl}>
          <SchemaEditor
            schemaType={keySchema.type}
            onSchemaDefinition={(v) => {
              if (v === undefined) {
                setKeySchema((schema) => ({ ...schema, definition: undefined, updateState: "in-progress" }));
                return;
              }

              setKeySchema((schema) => ({ ...schema, definition: v, updateState: "ready" }));
            }}
            onSchemaDefinitionError={() => {
              setKeySchema((schema) => ({ ...schema, definition: undefined, updateState: "in-progress" }));
            }}
            defaultSchemaDefinition={undefined}
            withoutKeyValueEditor={true}
          />
        </div>
      </div>

      <div>
        <div className={s.FormControl}>
          <strong>Value Schema</strong>
          <SchemaTypeInput
            value={valueSchema.type}
            onChange={(v) => {
              setValueSchema((schema) => {
                return {
                  ...schema,
                  type: v,
                  updateState: isSchemaShouldHaveDefinition(v) ? "in-progress" : "ready",
                };
              });
            }}
            withoutKeyValue={true}
          />
        </div>
        <div className={s.FormControl}>
          <SchemaEditor
            schemaType={valueSchema.type}
            onSchemaDefinition={(v) => {
              if (v === undefined) {
                setValueSchema((schema) => ({ ...schema, definition: undefined, updateState: "in-progress" }));
                return;
              }

              setValueSchema((schema) => ({ ...schema, definition: v, updateState: "ready" }));
            }}
            onSchemaDefinitionError={() => {
              setValueSchema((schema) => ({ ...schema, definition: undefined, updateState: "in-progress" }));
            }}
            defaultSchemaDefinition={undefined}
            withoutKeyValueEditor={true}
          />
        </div>
      </div>
    </div>
  )
}

export default KeyValueSchemaEditor;