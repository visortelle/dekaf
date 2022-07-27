import React from 'react';
import s from './ProtobufNativeEditor.module.css'
import * as Notifications from '../../../app/contexts/Notifications';
import Upload from 'rc-upload';
import { options } from 'numeral';

export type ProtobufNativeEditorProps = {};

type UploadState = 'awaiting' | 'uploading' | 'done' | 'error';

type FileEntry = {
  name: string,
  relativePath: string;
  content: string;
}

type CreateFrom = 'text' | 'single-file' | 'directory';

const ProtobufNativeEditor: React.FC<ProtobufNativeEditorProps> = (props) => {
  const { notifyError, notifySuccess } = Notifications.useContext();
  const [uploadState, setUploadState] = React.useState<UploadState>('awaiting');
  const [createFrom, setCreateFrom] = React.useState<CreateFrom>('single-file');

  const submitFiles = async (files: FileEntry[]) => {
    setUploadState('awaiting');
    notifySuccess('Schema successfully uploaded');
  }

  return (
    <div className={s.ProtobufNativeEditor}>
      protobuf native editor
      {(createFrom === 'single-file' || createFrom === 'directory') && (
        <Upload
          directory={createFrom === 'directory'}
          beforeUpload={async (_, _files) => {
            let files: FileEntry[] = [];
            for (let file of _files) {
              const content = await file.text();
              files.push({ name: file.name, relativePath: file.name, content });
            }

            submitFiles(files);
            return false;
          }}
        >
          <div className={s.UploadSchema}>
            Upload directory
          </div>
        </Upload>
      )}
    </div>
  );
}

export default ProtobufNativeEditor;
