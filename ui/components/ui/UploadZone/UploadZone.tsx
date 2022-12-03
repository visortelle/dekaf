import { useRef } from "react";
import Upload from 'rc-upload';
import s from './UploadZone.module.css';
import SvgIcon from "../SvgIcon/SvgIcon";
import uploadIcon from './upload.svg';

export type UploadZoneProps = {
  children: React.ReactNode,
  onFiles: (files: FileEntry[]) => void,
  isDirectory: boolean,
}
export type FileEntry = {
  relativePath: string;
  content: string;
}

const UploadZone: React.FC<UploadZoneProps> = (props) => {
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
        <div className={s.UploadZoneIcon}>
          <SvgIcon svg={uploadIcon} />
        </div>
        {props.children}
      </div>
    </Upload>
  );
}


export default UploadZone;
