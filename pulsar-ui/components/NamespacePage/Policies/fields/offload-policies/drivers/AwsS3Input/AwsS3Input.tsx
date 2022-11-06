import React from 'react';
import s from './AwsS3Input.module.css'
import { AwsS3OffloadPolicy } from '../../types';
import Input from '../../../../../../ui/Input/Input';
import MemorySizeInput from '../../../../../../ui/ConfigurationTable/MemorySizeInput/MemorySizeInput';
import FormLabel from '../../../../../../ui/ConfigurationTable/FormLabel/FormLabel';
import Select from '../../../../../../ui/Select/Select';
import FormItem from '../../../../../../ui/ConfigurationTable/FormItem/FormItem';
import A from '../../../../../../ui/A/A';

export type AwsS3InputProps = {
  value: AwsS3OffloadPolicy,
  onChange: (value: AwsS3OffloadPolicy) => void,
};

const AwsS3Input: React.FC<AwsS3InputProps> = (props) => {
  const isReadBufferSizeSpecified = props.value.s3ManagedLedgerOffloadReadBufferSizeInBytes !== undefined && props.value.s3ManagedLedgerOffloadReadBufferSizeInBytes !== 0;
  const isMaxBlockSizeSpecified = props.value.s3ManagedLedgerOffloadMaxBlockSizeInBytes !== undefined && props.value.s3ManagedLedgerOffloadMaxBlockSizeInBytes !== 0;

  return (
    <div className={s.AwsS3Input}>
      <FormItem>
        <FormLabel
          content="Bucket"
          isRequired
          help="A bucket is a basic container that holds your data. Everything you store in AWS S3 must be contained in a bucket. You can use a bucket to organize your data and control access to your data, but unlike a directory and folder, you cannot nest a bucket."
        />
        <Input
          value={props.value.s3ManagedLedgerOffloadBucket}
          onChange={v => props.onChange({ ...props.value, s3ManagedLedgerOffloadBucket: v })}
          placeholder="pulsar-topic-offload"
        />
      </FormItem>

      <FormItem>
        <FormLabel
          content="Region"
          help={(
            <>
              AWS S3 bucket region.
              <br />
              <br />
              <strong>Note: </strong>before specifying a value for this parameter, you need to set the following configurations. Otherwise, you might get an error.
              <br />
              <br />

              <ul>
                <li>
                  Set the <strong>Service endpoint</strong> property or ensure that <code>s3ManagedLedgerOffloadServiceEndpoint</code> property is set in your <code>broker.conf</code>.
                </li>
                <li>
                  Grant <code>GetBucketLocation</code> permission to a user.
                </li>
              </ul>

              <br />
              More info:
              <ul>
                <li>
                  <A isExternalLink href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-with-s3-actions.html#using-with-s3-actions-related-to-buckets">
                    How to grant GetBucketLocation permission to a user
                  </A>
                </li>
              </ul>
            </>
          )}
        />
        <Input
          value={props.value.s3ManagedLedgerOffloadRegion || ''}
          onChange={v => props.onChange({ ...props.value, s3ManagedLedgerOffloadRegion: v })}
          placeholder="eu-west-3"
        />
      </FormItem>

      <FormItem>
        <FormLabel
          content="Service endpoint"
          help={
            <div>
              The endpoint is the region where a bucket is located.
              <br />
              For more information about Aliyun OSS regions and endpoints,
              <br />
              <br />
              More info:
              <ul>
                <li>
                  <A isExternalLink href="https://docs.aws.amazon.com/general/latest/gr/s3.html">Amazon S3 endpoints documentation</A>.
                </li>
              </ul>
            </div>
          }
        />
        <Input
          value={props.value.s3ManagedLedgerOffloadServiceEndpoint || ''}
          onChange={v => props.onChange({ ...props.value, s3ManagedLedgerOffloadServiceEndpoint: v })}
          placeholder="https://s3.YOUR_REGION.amazonaws.com"
        />
      </FormItem>

      <FormItem>
        <FormLabel
          content="Read buffer size"
          help="Block size for each individual read when reading back data from AWS S3."
        />
        <FormItem>
          <Select<'not-specified' | 'specified'>
            value={isReadBufferSizeSpecified ? 'specified' : 'non-specified'}
            list={[{ type: 'item', value: 'not-specified', title: 'Not specified' }, { type: 'item', value: 'specified', title: 'Specified' }]}
            onChange={v => {
              if (v === 'not-specified') {
                props.onChange({ ...props.value, s3ManagedLedgerOffloadReadBufferSizeInBytes: undefined });
              } else {
                props.onChange({ ...props.value, s3ManagedLedgerOffloadReadBufferSizeInBytes: 1024 * 1024 });
              }
            }}
          />
        </FormItem>

        {isReadBufferSizeSpecified && (
          <MemorySizeInput
            initialValue={props.value.s3ManagedLedgerOffloadReadBufferSizeInBytes || 0}
            onChange={v => props.onChange({ ...props.value, s3ManagedLedgerOffloadReadBufferSizeInBytes: v })}
          />
        )}
      </FormItem>

      <FormItem>
        <FormLabel
          content="Block size"
          help={<div>Maximum block size sent during a multi-part upload to AWS S3. <br /><strong>It cannot be smaller than 5 MB.</strong></div>}
        />
        <FormItem>
          <Select<'not-specified' | 'specified'>
            value={isMaxBlockSizeSpecified ? 'specified' : 'not-specified'}
            list={[{ type: 'item', value: 'not-specified', title: 'Not specified' }, { type: 'item', value: 'specified', title: 'Specified' }]}
            onChange={v => {
              if (v === 'not-specified') {
                props.onChange({ ...props.value, s3ManagedLedgerOffloadMaxBlockSizeInBytes: undefined });
              } else {
                props.onChange({ ...props.value, s3ManagedLedgerOffloadMaxBlockSizeInBytes: 1024 * 1024 * 64 });
              }
            }}
          />
        </FormItem>

        {isMaxBlockSizeSpecified && (
          <MemorySizeInput
            initialValue={props.value.s3ManagedLedgerOffloadMaxBlockSizeInBytes || 0}
            onChange={v => props.onChange({ ...props.value, s3ManagedLedgerOffloadMaxBlockSizeInBytes: v })}
          />
        )}
      </FormItem>
    </div>
  );
}

export default AwsS3Input;
