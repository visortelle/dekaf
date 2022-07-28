import React, { useEffect } from 'react';
import s from './ProtobufNativeEditor.module.css'
import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import uploadIcon from '!!raw-loader!./upload.svg';
import SvgIcon from '../../../ui/SvgIcon/SvgIcon';
import Upload from 'rc-upload';
import Select from '../../../ui/Select/Select';
import { CompiledProtobufNativeFile, CompileProtobufNativeRequest, CompileProtobufNativeResponse, FileEntry as FileEntryPb } from '../../../../grpc-web/tools/teal/pulsar/ui/api/v1/schema_pb';
import { divide } from 'lodash';

export type ProtobufNativeEditorProps = {};

type UploadState = 'awaiting' | 'uploading' | 'done' | 'error';

type FileEntry = {
  relativePath: string;
  content: string;
}

type CreateFrom = 'text' | 'single-file' | 'directory';

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
    if (compilationError !== undefined) {
      setCompilationError(compilationError);
      setSelectedMessage(undefined);
    }

    const selectedMessage = file.getSchemasMap().getEntryList().map(([k]) => k)[0];
    setSelectedMessage(selectedMessage);
  }, [selectedFile]);

  const fileNames = files === undefined ? [] : files.getEntryList().map(([k]) => k);

  return (
    <div className={s.ProtobufNativeEditor}>
      <div>
        <Select<CreateFrom>
          list={[
            { type: 'item', title: 'Editor', value: 'text' },
            { type: 'item', title: 'Single .proto file', value: 'single-file' },
            { type: 'item', title: 'Directory with .proto files', value: 'directory' },
          ]}
          value={createFrom}
          onChange={setCreateFrom}
        />
      </div>

      {(createFrom === 'single-file' || createFrom === 'directory') && (
        <UploadZone isDirectory={createFrom === 'directory'} onFiles={(files) => submitFiles(files)}>
          <div className={s.UploadZoneIcon}>
            <SvgIcon svg={uploadIcon} />
          </div>
          {createFrom === 'single-file' && "Click here or drag'n'drop a .proto file"}
          {createFrom === 'directory' && "Click here or drag'n'drop a directory with .proto files"}
        </UploadZone>
      )}

      {fileNames.length > 0 && selectedFile !== undefined && (
        <div>
          <strong>File</strong>
          <Select<string>
            list={sortFilePaths(fileNames).map(name => ({ type: 'item', title: name, value: name }))}
            value={selectedFile}
            onChange={setSelectedFile}
          />
        </div>
      )}
      {selectedFile !== undefined && selectedMessage !== undefined && (
        <div>
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
        <div>
          <strong>Schema</strong>
          <textarea
            rows={20}
            cols={80}
            spellCheck={false}
            style={{ display: 'block'}}
            value={files?.get(selectedFile)?.getSchemasMap().get(selectedMessage)?.getHumanReadableSchema()}
          />
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
  return (
    <Upload
      directory={props.isDirectory}
      beforeUpload={async (_, _files) => {
        console.log('BEFORE');
        let files: FileEntry[] = [];
        for (let file of _files) {
          const content = await file.text();
          files.push({ relativePath: file.webkitRelativePath || file.name, content });
        }

        props.onFiles(files);
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
