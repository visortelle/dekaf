import React from 'react';
import s from './ProtobufNativeEditor.module.css'
import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import uploadIcon from '!!raw-loader!./upload.svg';
import SvgIcon from '../../../ui/SvgIcon/SvgIcon';
import Upload from 'rc-upload';
import Select from '../../../ui/Select/Select';
import { CompileProtobufNativeRequest, FileEntry as FileEntryPb } from '../../../../grpc-web/tools/teal/pulsar/ui/api/v1/schema_pb';

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

    const res = await schemaServiceClient.compileProtobufNative(compileReq, {});
    console.log(res);

    setUploadState('awaiting');
    notifySuccess('Schema successfully uploaded');
  }

  return (
    <div className={s.ProtobufNativeEditor}>
      protobuf native editor

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
        let files: FileEntry[] = [];
        for (let file of _files) {
          const content = await file.text();
          console.log('files', _files);
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

export default ProtobufNativeEditor;
