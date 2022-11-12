import React from 'react';
import s from './S3Input.module.css'
import { S3OffloadPolicy } from '../../types';
import Input from '../../../../../../ui/Input/Input';
import MemorySizeInput, { maxInt32 } from '../../../../../../ui/ConfigurationTable/MemorySizeInput/MemorySizeInput';
import FormLabel from '../../../../../../ui/ConfigurationTable/FormLabel/FormLabel';
import Select from '../../../../../../ui/Select/Select';
import FormItem from '../../../../../../ui/ConfigurationTable/FormItem/FormItem';

export type S3InputProps = {
  value: S3OffloadPolicy,
  onChange: (value: S3OffloadPolicy) => void,
};

const S3Input: React.FC<S3InputProps> = (props) => {
  const isReadBufferSizeSpecified = props.value.managedLedgerOffloadReadBufferSizeInBytes !== undefined;
  const isMaxBlockSizeSpecified = props.value.managedLedgerOffloadMaxBlockSizeInBytes !== undefined;

  return (
    <div className={s.S3Input}>
      <FormItem>
        <FormLabel
          content="Bucket"
          isRequired
          help={(
            <>
              A bucket is a basic container that holds your data. Everything you store in S3-compatible storage must be contained in a bucket. You can use a bucket to organize your data and control access to your data, but unlike a directory and folder, you cannot nest a bucket.
            </>
          )}
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
          help={
            <div>
              The endpoint is the region where a bucket is located.
            </div>
          }
        />
        <Input
          value={props.value.managedLedgerOffloadServiceEndpoint || ''}
          onChange={v => props.onChange({ ...props.value, managedLedgerOffloadServiceEndpoint: v })}
          placeholder="http://localhost:9000"
        />
      </FormItem>

      <FormItem>
        <FormLabel
          content="Read buffer size"
          help="Block size for each individual read when reading back data from S3-compatible storage."
        />
        <FormItem>
          <Select<'not-specified' | 'specified'>
            value={isReadBufferSizeSpecified ? 'specified' : 'non-specified'}
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
            maxLimitBytes={maxInt32}
          />
        )}
      </FormItem>

      <FormItem>
        <FormLabel
          content="Block size"
          help={<div>Maximum size of &quot;part&quot; sent during a multi-part upload to S3-compatible storage. <br /><strong>It cannot be smaller than 5 MB.</strong></div>}
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
            maxLimitBytes={maxInt32}
          />
        )}
      </FormItem>
    </div>
  );
}

export default S3Input;
