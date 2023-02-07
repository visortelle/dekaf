import React, { useEffect } from 'react';
import s from './ProtobufNativeEditor.module.css'
import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import uploadIcon from './upload.svg';
import Select from '../../../ui/Select/Select';
import { CompileProtobufNativeRequest, CompileProtobufNativeResponse, FileEntry as FileEntryPb } from '../../../../grpc-web/tools/teal/pulsar/ui/api/v1/schema_pb';
import Pre from '../../../ui/Pre/Pre';
import CodeEditor from '../../../ui/CodeEditor/CodeEditor';
import Button from '../../../ui/Button/Button';
import UploadZone, { FileEntry } from '../../../ui/UploadZone/UploadZone';
import A from '../../../ui/A/A';

export type ProtobufNativeEditorProps = {
  onSchemaDefinition: (schema: Uint8Array | undefined) => void;
  onSchemaDefinitionError: (error: string) => void;
};

type Source = 'code-editor' | 'single-file' | 'directory';

const defaultCodeEditorValue = `syntax = "proto3";

message ExampleSchema {
  string name = 1;
  int32 age = 2;
  bool items = 3;
}
`

const ProtobufNativeEditor: React.FC<ProtobufNativeEditorProps> = (props) => {
  const { notifyError } = Notifications.useContext();
  const [source, setSource] = React.useState<Source>('code-editor');
  const [files, setFiles] = React.useState<ReturnType<CompileProtobufNativeResponse['getFilesMap']> | undefined>(undefined);
  const [codeEditorValue, setCodeEditorValue] = React.useState<string>(defaultCodeEditorValue);
  const [selectedFile, setSelectedFile] = React.useState<string | undefined>(undefined);
  const [selectedMessage, setSelectedMessage] = React.useState<string | undefined>(undefined);
  const [compilationError, setCompilationError] = React.useState<string | undefined>(undefined);
  const { schemaServiceClient } = PulsarGrpcClient.useContext();

  const submitFiles = async (files: FileEntry[]) => {
    setFiles(() => undefined);
    setSelectedFile(() => undefined);
    setSelectedMessage(() => undefined);
    setCompilationError(() => undefined);

    const filesPb = files.map(file => {
      const filePb = new FileEntryPb();
      filePb.setRelativePath(file.relativePath);
      filePb.setContent(file.content);
      return filePb;
    });

    const compileReq = new CompileProtobufNativeRequest();
    compileReq.setFilesList(filesPb);

    const res = await schemaServiceClient.compileProtobufNative(compileReq, {}).catch(err => notifyError(err));
    if (res === undefined) {
      return;
    }

    setFiles(() => res.getFilesMap());

    const selectedFile = res.getFilesMap().getEntryList()[0][0];
    setSelectedFile(selectedFile);
  }

  useEffect(() => {
    if (files === undefined || selectedFile === undefined) {
      return;
    }

    const file = files.get(selectedFile);
    if (file === undefined) {
      return;
    }

    const compilationError = file.getCompilationError() || undefined;
    setCompilationError(compilationError);

    if (compilationError !== undefined && compilationError.length > 0) {
      props.onSchemaDefinitionError(compilationError);
      setSelectedMessage(undefined);
    }

    if (file.getSchemasMap().getLength() === 0) {
      return;
    }

    const messageName = file.getSchemasMap().keys().next().value;

    setSelectedMessage(messageName);
  }, [selectedFile]);

  useEffect(() => {
    if (files === undefined || selectedFile === undefined || selectedMessage === undefined) {
      return;
    }

    const file = files.get(selectedFile);
    if (file === undefined) {
      return;
    }

    const messageSchema = file.getSchemasMap().get(selectedMessage);
    const rawSchema = messageSchema?.getRawSchema_asU8();
    if (rawSchema !== undefined) {
      props.onSchemaDefinition(rawSchema);
    }
  }, [selectedFile, selectedMessage]);

  useEffect(() => {
    setSelectedFile(undefined);
    setSelectedMessage(undefined);
    props.onSchemaDefinition(undefined);
  }, [source]);

  const fileNames = files === undefined ? [] : files.getEntryList().map(([k]) => k);

  return (
    <div className={s.ProtobufNativeEditor}>
      <div className={s.FormControl}>
        <strong>Source</strong>
        <Select<Source>
          list={[
            { type: 'item', title: 'Code', value: 'code-editor' },
            { type: 'item', title: 'Single .proto file', value: 'single-file' },
            { type: 'item', title: 'Directory with .proto files', value: 'directory' },
          ]}
          value={source}
          onChange={setSource}
        />
      </div>

      {source === 'code-editor' && (
        <div className={s.CodeEditorContainer}>
          <div className={s.CodeEditor}>
            <CodeEditor
              height="320rem"
              defaultLanguage="proto"
              value={codeEditorValue}
              onChange={(v) => setCodeEditorValue(v || '')}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Button
              text="Upload"
              type={selectedFile === undefined ? "primary" : "regular"}
              svgIcon={uploadIcon}
              onClick={() => {
                submitFiles([{ relativePath: 'schema.proto', content: codeEditorValue }]);
              }}
            />
            <A isExternalLink href="https://developers.google.com/protocol-buffers/docs/proto3">Protobuf reference</A>
          </div>
        </div>
      )}

      {(source === 'single-file' || source === 'directory') && (
        <div className={s.FormControl}>
          <UploadZone isDirectory={source === 'directory'} onFiles={(files) => submitFiles(files)}>
            {source === 'single-file' && "Click here or drag'n'drop a .proto file"}
            {source === 'directory' && "Click here or drag'n'drop a directory with .proto files"}
          </UploadZone>
        </div>
      )}

      {fileNames.length > 0 && selectedFile !== undefined && (
        <div className={s.FormControl}>
          <strong>File</strong>
          <Select<string>
            list={sortFilePaths(fileNames).map(name => ({ type: 'item', title: name, value: name }))}
            value={selectedFile}
            onChange={setSelectedFile}
          />
        </div>
      )}
      {selectedFile !== undefined && selectedMessage !== undefined && (
        <div className={s.FormControl}>
          <strong>Message</strong>
          <Select<string>
            list={files?.get(selectedFile)?.getSchemasMap().getEntryList().map(([k]) => k).map(message => ({ type: 'item', title: message, value: message })) || []}
            onChange={setSelectedMessage}
            value={selectedMessage}
          />
        </div>
      )}
      {compilationError !== undefined && compilationError.length > 0 && (
        <div className={s.CompilationError}>
          {compilationError.split('\n').map((line, i) => (<div key={i}>{line}</div>))}
        </div>
      )}

      {selectedFile !== undefined && selectedMessage !== undefined && (
        <div className={s.FormControl}>
          <strong>Schema</strong>
          <Pre>
            {files?.get(selectedFile)?.getSchemasMap().get(selectedMessage)?.getHumanReadableSchema()}
          </Pre>
        </div>
      )}
    </div>
  );
}

export function sortFilePaths(filePaths: string[]): string[] {
  const sep = "/";
  return filePaths.sort((a, b) => {
    const aPath = a.split(sep);
    const bPath = b.split(sep);
    const minLength = Math.min(aPath.length, bPath.length);
    for (let i = 0; i < minLength; i++) {
      const aPart = aPath[i];
      const bPart = bPath[i];
      if (aPart !== bPart) {
        return aPart.localeCompare(bPart);
      }
    }
    return aPath.length - bPath.length;
  });
}

export default ProtobufNativeEditor;
