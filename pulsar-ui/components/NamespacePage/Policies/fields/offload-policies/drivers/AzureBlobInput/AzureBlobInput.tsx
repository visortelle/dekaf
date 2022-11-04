import React from 'react';
import s from './AzureBlobInput.module.css'
import { AzureBlobOffloadPolicy } from '../../types';
import Input from '../../../../../../ui/Input/Input';
import MemorySizeInput from '../../../../../../ui/ConfigurationTable/MemorySizeInput/MemorySizeInput';
import FormLabel from '../../../../../../ui/ConfigurationTable/FormLabel/FormLabel';
import Select from '../../../../../../ui/Select/Select';
import FormItem from '../../../../../../ui/ConfigurationTable/FormItem/FormItem';
import A from '../../../../../../ui/A/A';

export type AzureBlobInputProps = {
  value: AzureBlobOffloadPolicy,
  onChange: (value: AzureBlobOffloadPolicy) => void,
};

const AzureBlobInput: React.FC<AzureBlobInputProps> = (props) => {
  const isReadBufferSizeSpecified = props.value.managedLedgerOffloadReadBufferSizeInBytes !== undefined;
  const isMaxBlockSizeSpecified = props.value.managedLedgerOffloadMaxBlockSizeInBytes !== undefined;

  return (
    <div className={s.AzureBlobInput}>
      <FormItem>
        <FormLabel
          content="Container (bucket)"
          isRequired
          help={(
            <>
              A bucket is a basic container that holds your data. Everything you store in Azure BlobStore must be contained in a bucket. You can use a bucket to organize your data and control access to your data, but unlike a directory and folder, you cannot nest a bucket.
              <br />
              <br />
              More info:
              <ul>
                <li>
                  <A isExternalLink href="https://docs.microsoft.com/en-us/azure/storage/blobs/storage-blobs-introduction">Introduction to Azure Blob storage</A>
                </li>
              </ul>
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
          content="Read buffer size"
          help="Block size for each individual read when reading back data from Azure BlobStore store."
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
          />
        )}
      </FormItem>

      <FormItem>
        <FormLabel
          content="Block size"
          help={<div>Maximum size of &quot;part&quot; sent during a multi-part upload to Azure BlobStore store. <br /><strong>It cannot be smaller than 5 MB.</strong></div>}
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

export default AzureBlobInput;
