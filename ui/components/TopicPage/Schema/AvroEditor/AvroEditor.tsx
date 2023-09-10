import React, { useEffect } from 'react';
import s from './AvroEditor.module.css'
import CodeEditor from '../../../ui/CodeEditor/CodeEditor';
import { useDebounce } from 'use-debounce'
import UploadZone from '../../../ui/UploadZone/UploadZone';
import _ from 'lodash';
import Select from '../../../ui/Select/Select';
import Pre from '../../../ui/Pre/Pre';
import A from '../../../ui/A/A';

export type AvroEditorProps = {
  defaultSchemaDefinition: string | undefined;
  onSchemaDefinition: (schema: Uint8Array | undefined) => void;
};

type Source = 'code-editor' | 'single-file';

const defaultSchemaDefinition = `{
   "type": "record",
   "name": "ExampleSchema",
   "namespace": "example.com",
   "fields": [
      {
         "name": "name",
         "type": "string"
      },
      {
         "name": "age",
         "type": "int"
      },
      {
        "name": "hobbies",
        "type": {
          "type": "array",
          "items": "string",
          "default": []
        }
      }
   ]
}
`

const AvroEditor: React.FC<AvroEditorProps> = (props) => {
  const [source, setSource] = React.useState<Source>('code-editor');
  const [schemaDefinition, setSchemaDefinition] = React.useState<string | undefined>(props.defaultSchemaDefinition === undefined ? defaultSchemaDefinition : props.defaultSchemaDefinition);
  const [schemaDefinitionDebounced] = useDebounce(schemaDefinition, 300);
  const prevSchemaDefinition = React.useRef<string | undefined>(undefined);

  const submitSchema = () => {
    if (schemaDefinition === undefined) {
      props.onSchemaDefinition(undefined);
      return;
    }

    props.onSchemaDefinition(new TextEncoder().encode(schemaDefinitionDebounced));
  }

  useEffect(submitSchema, [schemaDefinitionDebounced]);

  useEffect(() => {
    if (source === 'single-file') {
      prevSchemaDefinition.current = schemaDefinition;
      setSchemaDefinition(undefined);
    } if (source === 'code-editor' && prevSchemaDefinition.current !== undefined) {
      setSchemaDefinition(prevSchemaDefinition.current);
    }
  }, [source]);

  return (
    <div className={s.AvroEditor}>
      <div className={s.FormControl}>
        <strong>Source</strong>
        <Select<Source>
          list={[
            { type: 'item', title: 'Code', value: 'code-editor' },
            { type: 'item', title: 'Single .avsc file', value: 'single-file' }
          ]}
          value={source}
          onChange={setSource}
          testId={"schema-source-select"}
        />
      </div>

      {source === 'code-editor' && (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className={s.CodeEditor} data-testid={"schema-editor-input"}>
            <CodeEditor
              height="320rem"
              defaultLanguage="json"
              value={schemaDefinition}
              onChange={(v) => setSchemaDefinition(v || '')}
            />
          </div>
          <A isExternalLink style={{ marginLeft: 'auto' }} href="https://avro.apache.org/docs/current/spec.html">AVRO reference</A>
        </div>
      )}

      {source === 'single-file' && (
        <>
          <div className={s.FormControl}>
            <UploadZone
              isDirectory={false}
              onFiles={(files) => setSchemaDefinition(files[0].content)}
              testId={"schema-upload-zone"}
            >
              {source === 'single-file' && "Click here or drag'n'drop a .avsc file"}
            </UploadZone>
          </div>
          {schemaDefinition !== undefined && (
            <div className={s.FormControl}>
              <strong>Schema</strong>
              <Pre>
                {schemaDefinitionDebounced}
              </Pre>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AvroEditor;
