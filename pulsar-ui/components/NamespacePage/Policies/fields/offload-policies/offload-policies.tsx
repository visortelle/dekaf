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
import AliyunOssInput from './drivers/AliyunOssInput';

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
            <div className={sf.FormItem}>
              <div className={sf.FormLabel}>Driver</div>
              <Select<PolicyValue['type']>
                value={value.type}
                list={[
                  { type: 'item', value: 'inherited-from-broker-config', title: 'Inherited from broker config' },
                  { type: 'item', value: 'aliyun-oss', title: 'aliyun-oss' },
                  { type: 'item', value: 'aws-s3', title: 'aws-s3' },
                  { type: 'item', value: 'azureblob', title: 'azureblob' },
                  { type: 'item', value: 'filesystem', title: 'filesystem' },
                  { type: 'item', value: 'google-cloud-storage', title: 'google-cloud-storage' },
                ]}
                onChange={(type) => onChange(defaultPolicyValueByType(type, policiesRes))}
              />
            </div>

            {value.type !== 'inherited-from-broker-config' && (
              <>
                <div className={sf.FormItem}>
                  <OffloadThresholdInput
                    value={value.managedLedgerOffloadThreshold}
                    onChange={v => onChange({ ...value, managedLedgerOffloadThreshold: v })}
                  />
                </div>


                <div className={sf.FormItem}>
                  <div className={sf.FormLabel}>Offloaders directory</div>
                  <Input
                    value={value.offloadersDirectory}
                    onChange={v => onChange({ ...value, offloadersDirectory: v })}
                    placeholder="offloaders"
                  />
                </div>

                <div className={sf.FormItem}>
                  <div className={sf.FormLabel}>Deletion lag</div>
                  <DurationInput
                    initialValue={Math.floor((value.managedLedgerOffloadDeletionLagInMillis || 0) / 1000)}
                    onChange={v => onChange({ ...value, managedLedgerOffloadDeletionLagInMillis: v * 1000 })}
                  />
                </div>
              </>
            )}

            {value.type === 'aliyun-oss' && (
              <AliyunOssInput
                value={value}
                onChange={onChange}
              />
            )}

            <div>NOTE! We assume that authentication is configured by Pulsar administrator.</div>
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
