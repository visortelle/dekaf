import React, { useEffect, useRef } from 'react';
import s from './ProtobufNativeEditor.module.css'
import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import uploadIcon from '!!raw-loader!./upload.svg';
import SvgIcon from '../../../ui/SvgIcon/SvgIcon';
import Upload from 'rc-upload';
import Select from '../../../ui/Select/Select';
import { CompileProtobufNativeRequest, CompileProtobufNativeResponse, FileEntry as FileEntryPb } from '../../../../grpc-web/tools/teal/pulsar/ui/api/v1/schema_pb';
import Pre from '../../../ui/Pre/Pre';

export type ProtobufNativeEditorProps = {
  onSchemaCompiled: (schema: Uint8Array) => void;
  onCompilationError: (error: string) => void;
};

type UploadState = 'awaiting' | 'uploading' | 'done' | 'error';

type FileEntry = {
  relativePath: string;
  content: string;
}

type CreateFrom = 'single-file' | 'directory';

const ProtobufNativeEditor: React.FC<ProtobufNativeEditorProps> = (props) => {
  const { notifyError, notifySuccess } = Notifications.useContext();
  const [uploadState, setUploadState] = React.useState<UploadState>('awaiting');
  const [createFrom, setCreateFrom] = React.useState<CreateFrom>('directory');
  const [files, setFiles] = React.useState<ReturnType<CompileProtobufNativeResponse['getFilesMap']> | undefined>(undefined);
  const [selectedFile, setSelectedFile] = React.useState<string | undefined>(undefined);
  const [selectedMessage, setSelectedMessage] = React.useState<string | undefined>(undefined);
  const [compilationError, setCompilationError] = React.useState<string | undefined>(undefined);
  const { schemaServiceClient } = PulsarGrpcClient.useContext();

  const submitFiles = async (files: FileEntry[]) => {
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

    setUploadState('awaiting');
  }

  useEffect(() => {
    if (files === undefined || selectedFile === undefined) {
      return;
    }

    const file = files.get(selectedFile);
    if (file === undefined) {
      return;
    }

    const compilationError = file.getCompilationError();
    if (compilationError !== undefined && compilationError.length > 0) {
      setCompilationError(compilationError);
      props.onCompilationError(compilationError);
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

    console.log('HELLO');
    const file = files.get(selectedFile);
    if (file === undefined) {
      return;
    }

    const messageSchema = file.getSchemasMap().get(selectedMessage);
    const rawSchema = messageSchema?.getRawSchema_asU8();
    if (rawSchema !== undefined) {
      props.onSchemaCompiled(rawSchema);
    }
  }, [selectedFile, selectedMessage]);

  const fileNames = files === undefined ? [] : files.getEntryList().map(([k]) => k);

  return (
    <div className={s.ProtobufNativeEditor}>
      <div className={s.FormControl}>
        <Select<CreateFrom>
          list={[
            { type: 'item', title: 'Single .proto file', value: 'single-file' },
            { type: 'item', title: 'Directory with .proto files', value: 'directory' },
          ]}
          value={createFrom}
          onChange={setCreateFrom}
        />
      </div>

      {(createFrom === 'single-file' || createFrom === 'directory') && (
        <div className={s.FormControl}>
          <UploadZone isDirectory={createFrom === 'directory'} onFiles={(files) => submitFiles(files)}>
            <div className={s.UploadZoneIcon}>
              <SvgIcon svg={uploadIcon} />
            </div>
            {createFrom === 'single-file' && "Click here or drag'n'drop a .proto file"}
            {createFrom === 'directory' && "Click here or drag'n'drop a directory with .proto files"}
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
      {compilationError !== undefined && (
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

type UploadZoneProps = {
  children: React.ReactNode,
  onFiles: (files: FileEntry[]) => void,
  isDirectory: boolean,
}

export const UploadZone: React.FC<UploadZoneProps> = (props) => {
  const filesBuffer = useRef<FileEntry[]>([]); // A simple way to hack a bit the <Upload /> component lifecycle.

  return (
    <Upload
      directory={props.isDirectory}
      beforeUpload={async (_file, _files) => {
        const content = await _file.text();
        filesBuffer.current.push({ relativePath: _file.webkitRelativePath || _file.name, content });

        if (filesBuffer.current.length === _files.length) {
          props.onFiles(filesBuffer.current);
          filesBuffer.current = [];
        }
        return false;
      }}
    >
      <div className={s.UploadZone}>
        {props.children}
      </div>
    </Upload>
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
