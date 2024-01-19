import React from 'react';
import s from './GoogleCloudStorageInput.module.css'
import { GoogleCloudStorageOffloadPolicy } from '../../types';
import Input from '../../../../../../ui/Input/Input';
import MemorySizeInput, { maxInt32 } from '../../../../../../ui/ConfigurationTable/MemorySizeInput/MemorySizeInput';
import FormLabel from '../../../../../../ui/ConfigurationTable/FormLabel/FormLabel';
import Select from '../../../../../../ui/Select/Select';
import FormItem from '../../../../../../ui/ConfigurationTable/FormItem/FormItem';
import A from '../../../../../../ui/A/A';

export type GoogleCloudStorageInputProps = {
  value: GoogleCloudStorageOffloadPolicy,
  onChange: (value: GoogleCloudStorageOffloadPolicy) => void,
};

const GoogleCloudStorageInput: React.FC<GoogleCloudStorageInputProps> = (props) => {
  const isReadBufferSizeSpecified = props.value.gcsManagedLedgerOffloadReadBufferSizeInBytes !== undefined;
  const isMaxBlockSizeSpecified = props.value.gcsManagedLedgerOffloadMaxBlockSizeInBytes !== undefined;

  return (
    <div className={s.GoogleCloudStorageInput}>
      <FormItem>
        <FormLabel
          content="Bucket"
          isRequired
          help={(
            <>
              A bucket is a basic container that holds your data. Everything you store in GCS must be contained in a bucket. You can use a bucket to organize your data and control access to your data, but unlike a directory and folder, you cannot nest a bucket.
              <br />
              <br />
              More info:
              <ul>
                <li>
                  <A isExternalLink href="https://cloud.google.com/storage/docs/buckets">About Cloud Storage buckets</A>
                </li>
              </ul>
            </>
          )}
        />
        <Input
          value={props.value.gcsManagedLedgerOffloadBucket}
          onChange={v => props.onChange({ ...props.value, gcsManagedLedgerOffloadBucket: v })}
          placeholder="pulsar-topic-offload"
        />
      </FormItem>

      <FormItem>
        <FormLabel
          content="Region"
          help={(
            <>
              Bucket region is the region where a bucket is located. If a bucket region is not specified, the default region (us multi-regional location) is used.
              <br />
              <br />
              More info:
              <ul>
                <li>
                  <A isExternalLink href="https://cloud.google.com/storage/docs/locations">
                    Bucket locations
                  </A>
                </li>
              </ul>
            </>
          )}
        />
        <Input
          value={props.value.gcsManagedLedgerOffloadRegion || ''}
          onChange={v => props.onChange({ ...props.value, gcsManagedLedgerOffloadRegion: v })}
          placeholder="eu-west-3"
        />
      </FormItem>

      <FormItem>
        <FormLabel
          content="Service account file"
          help={
            <div>
              To enable a broker to access GCS, you need to configure <code>gcsManagedLedgerOffloadServiceAccountKeyFile</code> in the configuration file <code>broker.conf</code>.
              <br />
              <br />
              <code>gcsManagedLedgerOffloadServiceAccountKeyFile</code> is a JSON file, containing GCS credentials of a service account.
              <br />
              <br />
              More info:
              <ul>
                <li>
                  <A isExternalLink href="https://support.google.com/googleapi/answer/6158849">Setting up OAuth 2.0</A>.
                </li>
                <li>
                  <A isExternalLink href="https://cloud.google.com/storage/docs/access-control/iam">Identity and Access Management</A>.
                </li>
              </ul>
            </div>
          }
        />
        <Input
          value={props.value.gcsManagedLedgerOffloadServiceAccountKeyFile || ''}
          onChange={v => props.onChange({ ...props.value, gcsManagedLedgerOffloadServiceAccountKeyFile: v })}
          placeholder="/Users/user-name/project-804d5e6a6f33.json"
        />
      </FormItem>

      <FormItem>
        <FormLabel
          content="Read buffer size"
          help="Block size for each individual read when reading back data from AWS S3."
        />
        <FormItem>
          <Select<'not-specified' | 'specified'>
            value={isReadBufferSizeSpecified ? 'specified' : 'not-specified'}
            list={[{ type: 'item', value: 'not-specified', title: 'Not specified' }, { type: 'item', value: 'specified', title: 'Specified' }]}
            onChange={v => {
              if (v === 'not-specified') {
                props.onChange({ ...props.value, gcsManagedLedgerOffloadReadBufferSizeInBytes: undefined });
              } else {
                props.onChange({ ...props.value, gcsManagedLedgerOffloadReadBufferSizeInBytes: 1024 * 1024 });
              }
            }}
          />
        </FormItem>

        {isReadBufferSizeSpecified && (
          <MemorySizeInput
            initialValue={props.value.gcsManagedLedgerOffloadReadBufferSizeInBytes || 0}
            onChange={v => props.onChange({ ...props.value, gcsManagedLedgerOffloadReadBufferSizeInBytes: v })}
            maxLimitBytes={maxInt32}
          />
        )}
      </FormItem>

      <FormItem>
        <FormLabel
          content="Block size"
          help={<div>Maximum size of &quot;part&quot; sent during a multi-part upload to AWS S3 store. <br /><strong>It cannot be smaller than 5 MB.</strong></div>}
        />
        <FormItem>
          <Select<'not-specified' | 'specified'>
            value={isMaxBlockSizeSpecified ? 'specified' : 'not-specified'}
            list={[{ type: 'item', value: 'not-specified', title: 'Not specified' }, { type: 'item', value: 'specified', title: 'Specified' }]}
            onChange={v => {
              if (v === 'not-specified') {
                props.onChange({ ...props.value, gcsManagedLedgerOffloadMaxBlockSizeInBytes: undefined });
              } else {
                props.onChange({ ...props.value, gcsManagedLedgerOffloadMaxBlockSizeInBytes: 1024 * 1024 * 64 });
              }
            }}
          />
        </FormItem>

        {isMaxBlockSizeSpecified && (
          <MemorySizeInput
            initialValue={props.value.gcsManagedLedgerOffloadMaxBlockSizeInBytes || 0}
            onChange={v => props.onChange({ ...props.value, gcsManagedLedgerOffloadMaxBlockSizeInBytes: v })}
            maxLimitBytes={maxInt32}
          />
        )}
      </FormItem>
    </div>
  );
}

export default GoogleCloudStorageInput;
