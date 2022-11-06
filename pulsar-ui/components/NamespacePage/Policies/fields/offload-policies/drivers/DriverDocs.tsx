import React from 'react';
import A from '../../../../../ui/A/A';
import FormItem from '../../../../../ui/ConfigurationTable/FormItem/FormItem';
import { PolicyValue } from '../types';
import s from './DriverDocs.module.css'

export type DriverDocsProps = {
  driverType: PolicyValue['type'];
};

const DriverDocs: React.FC<DriverDocsProps> = (props) => {
  if (props.driverType === 'inherited-from-broker-config') {
    return <></>;
  }

  return (
    <div className={s.DriverDocs}>
      {props.driverType === 'aliyun-oss' && (
        <A isExternalLink href="https://pulsar.apache.org/docs/tiered-storage-aliyun">Aliyun OSS offloader documentation</A>
      )}
      {props.driverType === 'S3' && (
        <A isExternalLink href="https://pulsar.apache.org/docs/tiered-storage-s3">S3 offloader documentation</A>
      )}
      {props.driverType === 'aws-s3' && (
        <A isExternalLink href="https://pulsar.apache.org/docs/tiered-storage-aws">AWS S3 offloader documentation</A>
      )}
    </div>
  );
}

export default DriverDocs;
