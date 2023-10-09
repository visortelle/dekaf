import React from 'react';
import s from './AliyunOssInput.module.css'
import { AliyunOssOffloadPolicy } from '../../types';
import Input from '../../../../../../ui/Input/Input';
import MemorySizeInput from '../../../../../../ui/ConfigurationTable/MemorySizeInput/MemorySizeInput';
import FormLabel from '../../../../../../ui/ConfigurationTable/FormLabel/FormLabel';
import Select from '../../../../../../ui/Select/Select';
import FormItem from '../../../../../../ui/ConfigurationTable/FormItem/FormItem';
import A from '../../../../../../ui/A/A';

export type AliyunOssInputProps = {
  value: AliyunOssOffloadPolicy,
  onChange: (value: AliyunOssOffloadPolicy) => void,
};

const AliyunOssInput: React.FC<AliyunOssInputProps> = (props) => {
  const isReadBufferSizeSpecified = props.value.managedLedgerOffloadReadBufferSizeInBytes !== undefined;
  const isMaxBlockSizeSpecified = props.value.managedLedgerOffloadMaxBlockSizeInBytes !== undefined;

  return (
    <div className={s.AliyunOssInput}>
      <FormItem>
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
      </FormItem>

      <FormItem>
        <FormLabel
          content="Service endpoint"
          isRequired
          help={
            <div>
              The endpoint is the region where a bucket is located.
              <br />
              <br />
              More info:
              <ul>
                <li>
                  <A isExternalLink href="https://www.alibabacloud.com/help/doc-detail/31837.htm">International website</A>
                </li>
                <li>
                  <A isExternalLink href='https://help.aliyun.com/document_detail/31837.html'>Chinese website</A>
                </li>
              </ul>
            </div>
          }
        />
        <Input
          value={props.value.managedLedgerOffloadServiceEndpoint}
          onChange={v => props.onChange({ ...props.value, managedLedgerOffloadServiceEndpoint: v })}
          placeholder="http://oss-us-west-1-internal.aliyuncs.com"
        />
      </FormItem>

      <FormItem>
        <FormLabel
          content="Read buffer size"
          help="Block size for each individual read when reading back data from S3-compatible storage."
        />
        <FormItem>
          <Select<'not-specified' | 'specified'>
            value={isReadBufferSizeSpecified ? 'specified' : 'not-specified'}
            list={[{ type: 'item', value: 'not-specified', title: 'Not specified' }, { type: 'item', value: 'specified', title: 'Specified' }]}
            onChange={v => {
              if (v === 'not-specified') {
                props.onChange({ ...props.value, managedLedgerOffloadReadBufferSizeInBytes: undefined });
              } else {
                props.onChange({ ...props.value, managedLedgerOffloadReadBufferSizeInBytes: 1024 * 1024 });
              }
            }}
          />
        </FormItem>

        {isReadBufferSizeSpecified && (
          <MemorySizeInput
            initialValue={props.value.managedLedgerOffloadReadBufferSizeInBytes || 0}
            onChange={v => props.onChange({ ...props.value, managedLedgerOffloadReadBufferSizeInBytes: v })}
          />
        )}
      </FormItem>

      <FormItem>
        <FormLabel
          content="Block size"
          help={<div>Maximum size of &quot;part&quot; sent during a multi-part upload to Aliyun OSS store. <br /><strong>It cannot be smaller than 5 MB.</strong></div>}
        />
        <FormItem>
          <Select<'not-specified' | 'specified'>
            value={isMaxBlockSizeSpecified ? 'specified' : 'not-specified'}
            list={[{ type: 'item', value: 'not-specified', title: 'Not specified' }, { type: 'item', value: 'specified', title: 'Specified' }]}
            onChange={v => {
              if (v === 'not-specified') {
                props.onChange({ ...props.value, managedLedgerOffloadMaxBlockSizeInBytes: undefined });
              } else {
                props.onChange({ ...props.value, managedLedgerOffloadMaxBlockSizeInBytes: 1024 * 1024 * 64 });
              }
            }}
          />
        </FormItem>

        {isMaxBlockSizeSpecified && (
          <MemorySizeInput
            initialValue={props.value.managedLedgerOffloadMaxBlockSizeInBytes || 0}
            onChange={v => props.onChange({ ...props.value, managedLedgerOffloadMaxBlockSizeInBytes: v })}
          />
        )}
      </FormItem>
    </div>
  );
}

export default AliyunOssInput;
