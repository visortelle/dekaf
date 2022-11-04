import React from 'react';
import s from './FilesystemInput.module.css'
import { FilesystemOffloadPolicy } from '../../types';
import Input from '../../../../../../ui/Input/Input';
import FormLabel from '../../../../../../ui/ConfigurationTable/FormLabel/FormLabel';
import FormItem from '../../../../../../ui/ConfigurationTable/FormItem/FormItem';

export type FilesystemInputProps = {
  value: FilesystemOffloadPolicy,
  onChange: (value: FilesystemOffloadPolicy) => void,
};

const FilesystemInput: React.FC<FilesystemInputProps> = (props) => {
  return (
    <div className={s.FilesystemInput}>
      <FormItem>
        <FormLabel
          content="Profile path"
          isRequired
          help={(
            <>
              HDFS or NFS profile path. The configuration file is stored in the Hadoop profile path.It contains various settings for Hadoop performance tuning.
            </>
          )}
        />
        <Input
          value={props.value.fileSystemProfilePath || ''}
          onChange={v => props.onChange({ ...props.value, fileSystemProfilePath: v })}
          placeholder="conf/filesystem_offload_core_site.xml"
        />
      </FormItem>

      <FormItem>
        <FormLabel
          content="URI (HDFS only)"
          help={(
            <>
              Connection address, which is the URI to access the default Hadoop distributed file system.
            </>
          )}
        />
        <Input
          value={props.value.fileSystemUri || ''}
          onChange={v => props.onChange({ ...props.value, fileSystemUri: v === '' ? undefined : v })}
          placeholder="hdfs://127.0.0.1:9000"
        />
      </FormItem>
    </div>
  );
}

export default FilesystemInput;
