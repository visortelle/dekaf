import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import DurationInput from '../../../ui/ConfigurationTable/DurationInput/DurationInput';
import Select from '../../../ui/Select/Select';
import sf from '../../../ui/ConfigurationTable/form.module.css';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb';
import { swrKeys } from '../../../swrKeys';
import WithUpdateConfirmation from '../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import { useState } from 'react';

const policy = 'offloadDeletionLag';

type PolicyValue = { type: 'inherited-from-broker-config' } |
{
  // Some info about -1 value: https://github.com/apache/pulsar/pull/5872
  type: 'disabled'
} |
{
  type: 'specified-for-this-namespace',
  offloadDeletionLagSeconds: number,
};

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
      const req = new pb.GetOffloadDeletionLagRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);

      const res = await namespaceServiceClient.getOffloadDeletionLag(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get message TTL: ${res.getStatus()?.getMessage()}`);
        return;
      }

      let initialValue: PolicyValue = { type: 'inherited-from-broker-config' };
      switch (res.getOffloadDeletionLagCase()) {
        case pb.GetOffloadDeletionLagResponse.OffloadDeletionLagCase.UNSPECIFIED: {
          initialValue = { type: 'inherited-from-broker-config' };
          break;
        }
        case pb.GetOffloadDeletionLagResponse.OffloadDeletionLagCase.SPECIFIED: {
          const offloadDeletionLagSeconds = (res.getSpecified()?.getOffloadDeletionLagMs() ?? 0) / 1000;

          if (offloadDeletionLagSeconds < 0) {
            initialValue = { type: 'disabled' };
          } else {
            initialValue = { type: 'specified-for-this-namespace', offloadDeletionLagSeconds };
          }

          break;
        }
      }

      return initialValue;
    }
  );

  if (initialValueError) {
    notifyError(`Unable to get message TTL. ${initialValueError}`);
  }

  if (initialValue === undefined) {
    return null;
  }

  return (
    <WithUpdateConfirmation<PolicyValue>
      key={key}
      initialValue={initialValue}
      onConfirm={async (value) => {
        if (value.type === 'inherited-from-broker-config') {
          const req = new pb.RemoveOffloadDeletionLagRequest();
          req.setNamespace(`${props.tenant}/${props.namespace}`);

          const res = await namespaceServiceClient.removeOffloadDeletionLag(req, {});
          if (res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set message TTL: ${res.getStatus()?.getMessage()}`);
          }
        }

        if (value.type === 'disabled' || value.type === 'specified-for-this-namespace') {
          const req = new pb.SetOffloadDeletionLagRequest();
          req.setNamespace(`${props.tenant}/${props.namespace}`);

          if (value.type === 'disabled') {
            req.setOffloadDeletionLagMs(-1);
          }

          if (value.type === 'specified-for-this-namespace') {
            req.setOffloadDeletionLagMs(value.offloadDeletionLagSeconds * 1000);
          }

          const res = await namespaceServiceClient.setOffloadDeletionLag(req, {});
          if (res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set message TTL: ${res.getStatus()?.getMessage()}`);
          }
        }

        await mutate(swrKey);
        setKey(key + 1); // Force rerender if fractional duration (1.2, 5.3, etc.) is set.
      }}
    >
      {({ value, onChange }) => {
        return (
          <>
            <div className={sf.FormItem}>
              <Select<PolicyValue['type']>
                list={[
                  { type: 'item', value: 'inherited-from-broker-config', title: 'Inherited from broker config' },
                  { type: 'item', value: 'disabled', title: 'Disabled' },
                  { type: 'item', value: 'specified-for-this-namespace', title: 'Specified for this namespace' },
                ]}
                onChange={(v) => {
                  switch (v) {
                    case 'inherited-from-broker-config': onChange({ type: 'inherited-from-broker-config' }); break;
                    case 'disabled': onChange({ type: 'disabled' }); break;
                    case 'specified-for-this-namespace': onChange({ type: 'specified-for-this-namespace', offloadDeletionLagSeconds: 1 }); break;
                  }
                }}
                value={value.type}
              />
            </div>
            {value.type === 'specified-for-this-namespace' && (
              <DurationInput
                value={value.offloadDeletionLagSeconds}
                onChange={v => onChange({ type: 'specified-for-this-namespace', offloadDeletionLagSeconds: v })}
              />
            )}
          </>
        );
      }}
    </WithUpdateConfirmation>
  )
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Offload deletion lag',
  description: <span>Duration to wait after offloading a ledger segment, before deleting the copy of that segment from cluster local storage.</span>,
  input: <FieldInput {...props} />
});

export default field;
