import React, { useEffect } from 'react';
import s from './AvroEditor.module.css'
import CodeEditor from '../../../ui/CodeEditor/CodeEditor';
import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import { useDebounce } from 'use-debounce'
import uploadIcon from '!!raw-loader!./upload.svg';
import UploadZone from '../../../ui/UploadZone/UploadZone';
import { CreateSchemaRequest, SchemaInfo, SchemaType } from '../../../../grpc-web/tools/teal/pulsar/ui/api/v1/schema_pb';
import _ from 'lodash';

export type AvroEditorProps = {
  onSchemaDefinition: (schema: Uint8Array) => void;
};

type UploadState = 'awaiting' | 'uploading' | 'done' | 'error';

type CreateFrom = 'code-editor' | 'single-file';

const defaultCodeEditorValue = `{
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
        "type": "array",
        "items": "string",
        "default": []
      }
   ]
}
`

const AvroEditor: React.FC<AvroEditorProps> = (props) => {
  const { notifyError, notifySuccess } = Notifications.useContext();
  const [uploadState, setUploadState] = React.useState<UploadState>('awaiting');
  const [createFrom, setCreateFrom] = React.useState<CreateFrom>('code-editor');
  const [codeEditorValue, setCodeEditorValue] = React.useState<string>(defaultCodeEditorValue);
  const [codeEditorValueDebounced] = useDebounce(codeEditorValue, 400);
  const [selectedFile, setSelectedFile] = React.useState<string | undefined>(undefined);
  const [selectedMessage, setSelectedMessage] = React.useState<string | undefined>(undefined);
  const { schemaServiceClient } = PulsarGrpcClient.useContext();

  const submit = () => {
    props.onSchemaDefinition(new TextEncoder().encode(codeEditorValueDebounced));
  }

  useEffect(submit, []);
  useEffect(submit, [codeEditorValueDebounced]);

  return (
    <div className={s.AvroEditor}>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div className={s.CodeEditor}>
          <CodeEditor
            height="320rem"
            defaultLanguage="json"
            value={codeEditorValue}
            onChange={(v) => setCodeEditorValue(v || '')}
          />
        </div>
        <a className="A" style={{ marginLeft: 'auto' }} href="https://avro.apache.org/docs/current/spec.html" target="__blank">Language reference</a>
      </div>

      {/* {(createFrom === 'single-file') && (
        <div className={s.FormControl}>
          <UploadZone isDirectory={false} onFiles={(files) => submitFiles(files)}>
            {createFrom === 'single-file' && "Click here or drag'n'drop a .avsc file"}
          </UploadZone>
        </div>
      )} */}


    </div>
  );
}

export default AvroEditor;
