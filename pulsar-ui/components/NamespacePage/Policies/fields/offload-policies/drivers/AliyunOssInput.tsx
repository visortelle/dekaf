import React from 'react';
import s from './AliyunOssInput.module.css'
import sf from '../../../../../ui/ConfigurationTable/form.module.css';
import { AliyunOssOffloadPolicy } from '../types';
import Input from '../../../../../ui/Input/Input';
import MemorySizeInput from '../../../../../ui/ConfigurationTable/MemorySizeInput/MemorySizeInput';
import OffloadThresholdInput from '../inputs/OffloadThresholdInput';
import FormLabel from '../../../../../ui/ConfigurationTable/FormLabel/FormLabel';
import { divide } from 'lodash';

export type AliyunOssInputProps = {
  value: AliyunOssOffloadPolicy,
  onChange: (value: AliyunOssOffloadPolicy) => void,
};

const AliyunOssInput: React.FC<AliyunOssInputProps> = (props) => {
  return (
    <div className={s.AliyunOssInput}>
      <div className={sf.FormItem}>
        <FormLabel
          content="Bucket"
          isRequired
          help="A bucket is a basic container that holds your data. Everything you store in Aliyun OSS must be contained in a bucket. You can use a bucket to organize your data and control access to your data, but unlike a directory and folder, you cannot nest a bucket."
        />
        <Input
          value={props.value.managedLedgerOffloadBucket}
          onChange={v => props.onChange({ ...props.value, managedLedgerOffloadBucket: v })}
          placeholder="pulsar-topic-offload"
        />
      </div>

      <div className={sf.FormItem}>
        <FormLabel
          content="Service endpoint"
          isRequired
          help={
            <div>
              The endpoint is the region where a bucket is located.
              <br />
              For more information about Aliyun OSS regions and endpoints,
              see <a target="__blank" href="https://www.alibabacloud.com/help/doc-detail/31837.htm">International website</a> or <a target="__blank" href='https://help.aliyun.com/document_detail/31837.html'>Chinese website</a>.
            </div>
          }
        />
        <Input
          value={props.value.managedLedgerOffloadServiceEndpoint}
          onChange={v => props.onChange({ ...props.value, managedLedgerOffloadServiceEndpoint: v })}
          placeholder="http://oss-us-west-1-internal.aliyuncs.com"
        />
      </div>



    </div>
  );
}

export default AliyunOssInput;
