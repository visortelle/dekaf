import * as Notifications from '../../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../../ui/ConfigurationTable/ConfigurationTable";
import DurationInput from '../../../../ui/ConfigurationTable/DurationInput/DurationInput';
import Select from '../../../../ui/Select/Select';
import sf from '../../../../ui/ConfigurationTable/form.module.css';
import * as pb from '../../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb';
import { swrKeys } from '../../../../swrKeys';
import WithUpdateConfirmation from '../../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation';
import { Code } from '../../../../../grpc-web/google/rpc/code_pb';
import { useState } from 'react';
import { PolicyValue } from './types';
import { defaultPolicyValueByType, offloadThresholdFromBytes, policyValueToReq, resToPolicyValue } from './conversions';
import Input from '../../../../ui/Input/Input';
import OffloadThresholdInput from './inputs/OffloadThresholdInput';
import AliyunOssInput from './drivers/AliyunOssInput/AliyunOssInput';
import AwsS3Input from './drivers/AwsS3Input/AwsS3Input';
import FormLabel from '../../../../ui/ConfigurationTable/FormLabel/FormLabel';
import A from '../../../../ui/A/A';
import FormItem from '../../../../ui/ConfigurationTable/FormItem/FormItem';
import DriverDocs from './drivers/DriverDocs';
import AzureBlobInput from './drivers/AzureBlobInput/AzureBlobInput';
import GoogleCloudStorageInput from './drivers/GoogleCloudStorageInput/GoogleCloudStorageInput';
import S3Input from './drivers/S3Input/S3Input';
import FilesystemInput from './drivers/FilesystemInput/FilesystemInput';

const policy = 'offloadPolicies';

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const { namespaceServiceClient } = PulsarGrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();
  const [key, setKey] = useState(0);
  const [policiesRes, setPoliciesRes] = useState<pb.GetOffloadPoliciesResponse>();

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

      setPoliciesRes(res);
      return resToPolicyValue(res);
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
        const req = policyValueToReq(value, props.tenant, props.namespace);

        let res;
        if (req instanceof pb.RemoveOffloadPoliciesRequest) {
          res = await namespaceServiceClient.removeOffloadPolicies(req, {})
            .catch(err => notifyError(`Unable to set offload policies: ${err}`));
        }
        if (req instanceof pb.SetOffloadPoliciesRequest) {
          res = await namespaceServiceClient
            .setOffloadPolicies(req, {}).catch(err => notifyError(`Unable to set offload policies: ${err}`));
        }

        if (res === undefined) {
          return;
        }

        if (res.getStatus()?.getCode() !== Code.OK) {
          notifyError(`Unable to set offload policies: ${res.getStatus()?.getMessage()}`);
          return;
        }

        await mutate(swrKey);
        setKey(key + 1);
      }}
    >
      {({ value, onChange }) => {
        return (
          <>
            <FormItem>
              <FormLabel
                content="Offloader driver"
                help={<span>Driver to use to offload old data to long term storage.</span>}
              />
              <Select<PolicyValue['type']>
                value={value.type}
                list={[
                  { type: 'item', value: 'inherited-from-broker-config', title: 'Inherited from broker config' },
                  { type: 'item', value: 'aliyun-oss', title: 'aliyun-oss' },
                  { type: 'item', value: 'aws-s3', title: 'aws-s3' },
                  { type: 'item', value: 'azureblob', title: 'azureblob' },
                  { type: 'item', value: 'filesystem', title: 'filesystem' },
                  { type: 'item', value: 'google-cloud-storage', title: 'google-cloud-storage' },
                  { type: 'item', value: 'S3', title: 's3' },
                ]}
                onChange={(type) => onChange(defaultPolicyValueByType(type, policiesRes))}
              />
            </FormItem>

            {value.type !== 'inherited-from-broker-config' && (
              <>
                <FormItem>
                  <DriverDocs driverType={value.type} />
                </FormItem>

                <FormItem>
                  <OffloadThresholdInput
                    value={value.managedLedgerOffloadThreshold}
                    onChange={v => onChange({ ...value, managedLedgerOffloadThreshold: v })}
                  />
                </FormItem>


                <FormItem>
                  <FormLabel
                    content="Offloaders directory"
                    isRequired
                    help={(
                      <>
                        If you are running Pulsar in a bare metal cluster, make sure that offloaders tarball is unzipped in every broker&apos;s pulsar directory.
                        <br />
                        <br />
                        If you are running Pulsar in Docker or deploying Pulsar using a docker image (e.g. K8S), you can use the <code>apachepulsar/pulsar-all</code> image instead of the <code>apachepulsar/pulsar</code> image. <code>apachepulsar/pulsar-all</code> image has already bundled tiered storage offloaders.
                      </>
                    )}
                  />
                  <Input
                    value={value.offloadersDirectory}
                    onChange={v => onChange({ ...value, offloadersDirectory: v })}
                    placeholder="offloaders"
                  />
                </FormItem>

                <FormItem>
                  <FormLabel
                    content="Deletion lag"
                    help="Duration to wait after offloading a ledger segment, before deleting the copy of that segment from cluster local storage."
                  />
                  <DurationInput
                    initialValue={Math.floor((value.managedLedgerOffloadDeletionLagInMillis || 0) / 1000)}
                    onChange={v => onChange({ ...value, managedLedgerOffloadDeletionLagInMillis: v * 1000 })}
                  />
                </FormItem>
              </>
            )
            }

            {value.type === 'aliyun-oss' && (
              <AliyunOssInput
                value={value}
                onChange={onChange}
              />
            )}
            {value.type === 'aws-s3' && (
              <AwsS3Input
                value={value}
                onChange={onChange}
              />
            )}
            {value.type === 'azureblob' && (
              <AzureBlobInput
                value={value}
                onChange={onChange}
              />
            )}
            {value.type === 'filesystem' && (
              <FilesystemInput
                value={value}
                onChange={onChange}
              />
            )}
            {value.type === 'google-cloud-storage' && (
              <GoogleCloudStorageInput
                value={value}
                onChange={onChange}
              />
            )}
            {value.type === 'S3' && (
              <S3Input
                value={value}
                onChange={onChange}
              />
            )}
          </>
        );
      }}
    </WithUpdateConfirmation >
  )
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Offload policies',
  description: (
    <>
      <div>Tiered Storage feature allows older backlog data to be offloaded to long term storage, thereby freeing up space in BookKeeper and reducing storage costs. </div>
      <br />
      More info:
      <ul>
        <li>
          <A isExternalLink href="https://pulsar.apache.org/docs/tiered-storage-overview/">Overview of Tiered Storage</A>
        </li>
        <li>
          <A isExternalLink href="https://pulsar.apache.org/docs/cookbooks-tiered-storage/">Tiered Storage cookbook</A>
        </li>
      </ul>
    </>
  ),
  input: <FieldInput {...props} />
});

export default field;
