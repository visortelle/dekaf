import * as Notifications from '../../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../../ui/ConfigurationTable/ConfigurationTable";
import DurationInput from '../../../../ui/ConfigurationTable/DurationInput/DurationInput';
import Select from '../../../../ui/Select/Select';
import sf from '../../../ui/ConfigurationTable/form.module.css';
import * as pb from '../../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb';
import { swrKeys } from '../../../../swrKeys';
import WithUpdateConfirmation from '../../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation';
import { Code } from '../../../../../grpc-web/google/rpc/code_pb';
import { useState } from 'react';
import {
  AliyunOssOffloadPolicy,
  AwsS3OffloadPolicy,
  AzureBlobOffloadPolicy,
  FilesystemOffloadPolicy,
  GoogleCloudStorageOffloadPolicy,
  S3OffloadPolicy
} from './types';
import { Int64Value, StringValue } from 'google-protobuf/google/protobuf/wrappers_pb';

const policy = 'offloadPolicies';

type AnyOffloadPolicy =
  AliyunOssOffloadPolicy |
  AwsS3OffloadPolicy |
  AzureBlobOffloadPolicy |
  FilesystemOffloadPolicy |
  GoogleCloudStorageOffloadPolicy |
  S3OffloadPolicy;

type PolicyValue = { type: 'inherited-from-broker-config' } | AnyOffloadPolicy;

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const { namespaceServiceClient } = PulsarGrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();
  const [key, setKey] = useState(0);

  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: initialValue, error: initialValueError } = useSWR(
    swrKey,
    async () => {
      const req = new pb.GetOffloadPoliciesRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);

      const res = await namespaceServiceClient.getOffloadPolicies(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get offload policies: ${res.getStatus()?.getMessage()}`);
        return;
      }

      let initialValue: PolicyValue = { type: 'inherited-from-broker-config' };
      // switch (res.getOffloadPoliciesCase()) {
      //   case pb.GetOffloadPoliciesResponse.OffloadPoliciesCase.UNSPECIFIED: {
      //     initialValue = { type: 'inherited-from-broker-config' };
      //     break;
      //   }
      //   case pb.GetOffloadPoliciesResponse.OffloadPoliciesCase.SPECIFIED: {
      //     const offloadPoliciesSeconds = (res.getSpecified()?.getOffloadPoliciesMs() ?? 0) / 1000;

      //     if (offloadPoliciesSeconds < 0) {
      //       initialValue = { type: 'disabled' };
      //     } else {
      //       initialValue = { type: 'specified-for-this-namespace', offloadPoliciesSeconds };
      //     }

      //     break;
      //   }
      // }

      return initialValue;
    }
  );

  if (initialValueError) {
    notifyError(`Unable to get offload deletion lag: ${initialValueError}`);
  }

  if (initialValue === undefined) {
    return null;
  }

  return (
    <WithUpdateConfirmation<PolicyValue>
      key={key}
      initialValue={initialValue}
      onConfirm={async (value) => {
      }}
    >
      {({ value, onChange }) => {
        return (
          <>

          </>
        );
      }}
    </WithUpdateConfirmation>
  )
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Offload policies',
  description: <span></span>,
  input: <FieldInput {...props} />
});

export default field;

function resToPolicyValue(res: pb.GetOffloadPoliciesResponse): PolicyValue {
  if (res.getOffloadPoliciesCase() === pb.GetOffloadPoliciesResponse.OffloadPoliciesCase.INHERITED) {
    return { type: 'inherited-from-broker-config' };
  }

  if (res.getOffloadPoliciesCase() === pb.GetOffloadPoliciesResponse.OffloadPoliciesCase.SPECIFIED) {
    const p = res.getSpecified()!;

    switch (p.getManagedLedgerOffloadDriver() as AnyOffloadPolicy['type']) {
      case 'aliyun-oss': {
        const v: AliyunOssOffloadPolicy = {
          type: 'aliyun-oss',
          offloadersDirectory: p.getOffloadersDirectory()?.toObject().value ?? '',
          managedLedgerOffloadBucket: p.getManagedLedgerOffloadBucket()?.toObject().value ?? '',
          managedLedgerOffloadServiceEndpoint: p.getManagedLedgerOffloadServiceEndpoint()?.toObject().value ?? '',
          managedLedgerOffloadReadBufferSizeInBytes: p.getManagedLedgerOffloadReadBufferSizeInBytes()?.toObject().value,
          managedLedgerOffloadMaxBlockSizeInBytes: p.getManagedLedgerOffloadMaxBlockSizeInBytes()?.toObject().value,
        }
        return v;
      }
      case 'aws-s3': {
        const v: AwsS3OffloadPolicy = {
          type: 'aws-s3',
          offloadersDirectory: p.getOffloadersDirectory()?.toObject().value ?? '',
          s3ManagedLedgerOffloadBucket: p.getS3ManagedLedgerOffloadBucket()?.toObject().value ?? '',
          s3ManagedLedgerOffloadRegion: p.getS3ManagedLedgerOffloadRegion()?.toObject().value,
          s3ManagedLedgerOffloadReadBufferSizeInBytes: p.getS3ManagedLedgerOffloadReadBufferSizeInBytes()?.toObject().value,
          s3ManagedLedgerOffloadMaxBlockSizeInBytes: p.getS3ManagedLedgerOffloadMaxBlockSizeInBytes()?.toObject().value
        }
        return v;
      }
      case 'azureblob': {
        const v: AzureBlobOffloadPolicy = {
          type: 'azureblob',
          offloadersDirectory: p.getOffloadersDirectory()?.toObject().value ?? '',
          managedLedgerOffloadBucket: p.getManagedLedgerOffloadBucket()?.toObject().value ?? '',
          managedLedgerOffloadReadBufferSizeInBytes: p.getManagedLedgerOffloadReadBufferSizeInBytes()?.toObject().value,
          managedLedgerOffloadMaxBlockSizeInBytes: p.getManagedLedgerOffloadMaxBlockSizeInBytes()?.toObject().value,
        }
        return v;
      }
      case 'filesystem': {
        const v: FilesystemOffloadPolicy = {
          type: 'filesystem',
          fileSystemProfilePath: p.getFileSystemProfilePath()?.toObject().value ?? '',
          offloadersDirectory: p.getOffloadersDirectory()?.toObject().value ?? '',
          fileSystemUri: p.getFileSystemUri()?.toObject().value ?? undefined,
        };
        return v;
      }
      case 'google-cloud-storage': {
        const v: GoogleCloudStorageOffloadPolicy = {
          type: 'google-cloud-storage',
          gcsManagedLedgerOffloadBucket: p.getGcsManagedLedgerOffloadBucket()?.toObject().value ?? '',
          gcsManagedLedgerOffloadRegion: p.getGcsManagedLedgerOffloadRegion()?.toObject().value ?? '',
          gcsManagedLedgerOffloadServiceAccountKeyFile: p.getGcsManagedLedgerOffloadServiceAccountKeyFile()?.toObject().value ?? '',
          offloadersDirectory: p.getOffloadersDirectory()?.toObject().value ?? '',
          gcsManagedLedgerOffloadMaxBlockSizeInBytes: p.getGcsManagedLedgerOffloadMaxBlockSizeInBytes()?.toObject().value,
          gcsManagedLedgerOffloadReadBufferSizeInBytes: p.getGcsManagedLedgerOffloadReadBufferSizeInBytes()?.toObject().value,
        }
        return v;
      }
      case 'S3': {
        const v: S3OffloadPolicy = {
          type: 'S3',
          managedLedgerOffloadBucket: p.getManagedLedgerOffloadBucket()?.toObject().value ?? '',
          managedLedgerOffloadServiceEndpoint: p.getManagedLedgerOffloadServiceEndpoint()?.toObject().value ?? '',
          offloadersDirectory: p.getOffloadersDirectory()?.toObject().value ?? '',
          managedLedgerOffloadMaxBlockSizeInBytes: p.getManagedLedgerOffloadMaxBlockSizeInBytes()?.toObject().value,
          managedLedgerOffloadReadBufferSizeInBytes: p.getManagedLedgerOffloadReadBufferSizeInBytes()?.toObject().value,
        }
        return v;
      }

      default: throw new Error(`Unknown offload driver: ${p.getManagedLedgerOffloadDriver()}`);
    }
  }

  throw new Error('Offload policies not set');
}

function policyValueToReq(p: PolicyValue, tenant: string, namespace: string): pb.RemoveOffloadPoliciesRequest | pb.SetOffloadPoliciesRequest {
  switch (p.type) {
    case 'inherited-from-broker-config': {
      const req = new pb.RemoveOffloadPoliciesRequest();
      req.setNamespace(`${tenant}/${namespace}`);
      return req;
    }
    case 'aliyun-oss': {
      const req = new pb.SetOffloadPoliciesRequest();
      req.setNamespace(`${tenant}/${namespace}`);

      const ppb = new pb.OffloadPoliciesSpecified();
      ppb.setManagedLedgerOffloadDriver('aliyun-oss');

      ppb.setOffloadersDirectory(new StringValue().setValue(p.offloadersDirectory));
      ppb.setManagedLedgerOffloadBucket(new StringValue().setValue(p.managedLedgerOffloadBucket));
      ppb.setManagedLedgerOffloadServiceEndpoint(new StringValue().setValue(p.managedLedgerOffloadServiceEndpoint));
      ppb.setManagedLedgerOffloadReadBufferSizeInBytes(
        p.managedLedgerOffloadReadBufferSizeInBytes === undefined ?
          undefined :
          new Int64Value().setValue(p.managedLedgerOffloadReadBufferSizeInBytes)
      );
      ppb.setManagedLedgerOffloadMaxBlockSizeInBytes(
        p.managedLedgerOffloadMaxBlockSizeInBytes === undefined ?
          undefined :
          new Int64Value().setValue(p.managedLedgerOffloadMaxBlockSizeInBytes)
      );

      req.setOffloadPolicies(ppb);
      return req;
    }

    case 'aws-s3': {
      const req = new pb.SetOffloadPoliciesRequest();
      req.setNamespace(`${tenant}/${namespace}`);

      const ppb = new pb.OffloadPoliciesSpecified();
      ppb.setManagedLedgerOffloadDriver('aws-s3');

      ppb.setOffloadersDirectory(new StringValue().setValue(p.offloadersDirectory));
      ppb.setS3ManagedLedgerOffloadBucket(new StringValue().setValue(p.s3ManagedLedgerOffloadBucket));
      ppb.setS3ManagedLedgerOffloadRegion(p.s3ManagedLedgerOffloadRegion === undefined ?
        undefined :
        new StringValue().setValue(p.s3ManagedLedgerOffloadRegion)
      );
      ppb.setS3ManagedLedgerOffloadReadBufferSizeInBytes(
        p.s3ManagedLedgerOffloadReadBufferSizeInBytes === undefined ?
          undefined :
          new Int64Value().setValue(p.s3ManagedLedgerOffloadReadBufferSizeInBytes)
      );
      ppb.setS3ManagedLedgerOffloadMaxBlockSizeInBytes(p.s3ManagedLedgerOffloadMaxBlockSizeInBytes === undefined ?
        undefined :
        new Int64Value().setValue(p.s3ManagedLedgerOffloadMaxBlockSizeInBytes)
      );

      req.setOffloadPolicies(ppb);
      return req;
    }

    case 'azureblob': {
      const req = new pb.SetOffloadPoliciesRequest();
      req.setNamespace(`${tenant}/${namespace}`);

      const ppb = new pb.OffloadPoliciesSpecified();
      ppb.setManagedLedgerOffloadDriver('azureblob');

      ppb.setOffloadersDirectory(new StringValue().setValue(p.offloadersDirectory));
      ppb.setManagedLedgerOffloadBucket(new StringValue().setValue(p.managedLedgerOffloadBucket));
      ppb.setManagedLedgerOffloadReadBufferSizeInBytes(
        p.managedLedgerOffloadReadBufferSizeInBytes === undefined ?
          undefined :
          new Int64Value().setValue(p.managedLedgerOffloadReadBufferSizeInBytes)
      );
      ppb.setManagedLedgerOffloadMaxBlockSizeInBytes(
        p.managedLedgerOffloadMaxBlockSizeInBytes === undefined ?
          undefined :
          new Int64Value().setValue(p.managedLedgerOffloadMaxBlockSizeInBytes)
      );

      req.setOffloadPolicies(ppb);
      return req;
    }

    case 'filesystem': {
      const req = new pb.SetOffloadPoliciesRequest();
      req.setNamespace(`${tenant}/${namespace}`);

      const ppb = new pb.OffloadPoliciesSpecified();
      ppb.setManagedLedgerOffloadDriver('filesystem');

      ppb.setOffloadersDirectory(new StringValue().setValue(p.offloadersDirectory));
      ppb.setFileSystemProfilePath(new StringValue().setValue(p.fileSystemProfilePath));
      ppb.setFileSystemUri(p.fileSystemUri === undefined ?
        undefined :
        new StringValue().setValue(p.fileSystemUri)
      );

      req.setOffloadPolicies(ppb);
      return req;
    }

    case 'google-cloud-storage': {
      const req = new pb.SetOffloadPoliciesRequest();
      req.setNamespace(`${tenant}/${namespace}`);

      const ppb = new pb.OffloadPoliciesSpecified();
      ppb.setManagedLedgerOffloadDriver('google-cloud-storage');

      ppb.setOffloadersDirectory(new StringValue().setValue(p.offloadersDirectory));
      ppb.setGcsManagedLedgerOffloadBucket(new StringValue().setValue(p.gcsManagedLedgerOffloadBucket));
      ppb.setGcsManagedLedgerOffloadRegion(new StringValue().setValue(p.gcsManagedLedgerOffloadRegion));
      ppb.setGcsManagedLedgerOffloadServiceAccountKeyFile(new StringValue().setValue(p.gcsManagedLedgerOffloadServiceAccountKeyFile));
      ppb.setGcsManagedLedgerOffloadReadBufferSizeInBytes(
        p.gcsManagedLedgerOffloadReadBufferSizeInBytes === undefined ?
          undefined :
          new Int64Value().setValue(p.gcsManagedLedgerOffloadReadBufferSizeInBytes)
      );
      ppb.setGcsManagedLedgerOffloadMaxBlockSizeInBytes(
        p.gcsManagedLedgerOffloadMaxBlockSizeInBytes === undefined ?
          undefined :
          new Int64Value().setValue(p.gcsManagedLedgerOffloadMaxBlockSizeInBytes)
      );

      req.setOffloadPolicies(ppb);
      return req;
    }

    case 'S3': {
      const req = new pb.SetOffloadPoliciesRequest();
      req.setNamespace(`${tenant}/${namespace}`);

      const ppb = new pb.OffloadPoliciesSpecified();
      ppb.setManagedLedgerOffloadDriver('S3');

      ppb.setOffloadersDirectory(new StringValue().setValue(p.offloadersDirectory));
      ppb.setManagedLedgerOffloadBucket(new StringValue().setValue(p.managedLedgerOffloadBucket));
      ppb.setManagedLedgerOffloadServiceEndpoint(new StringValue().setValue(p.managedLedgerOffloadServiceEndpoint));
      ppb.setManagedLedgerOffloadReadBufferSizeInBytes(
        p.managedLedgerOffloadReadBufferSizeInBytes === undefined ?
          undefined :
          new Int64Value().setValue(p.managedLedgerOffloadReadBufferSizeInBytes)
      );
      ppb.setManagedLedgerOffloadMaxBlockSizeInBytes(
        p.managedLedgerOffloadMaxBlockSizeInBytes === undefined ?
          undefined :
          new Int64Value().setValue(p.managedLedgerOffloadMaxBlockSizeInBytes)
      );
    }
  }
}
