import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import sf from '../../../ui/ConfigurationTable/form.module.css';
import Select from '../../../ui/Select/Select';
import DurationInput from '../../../ui/ConfigurationTable/DurationInput/DurationInput';
import { swrKeys } from '../../../swrKeys';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb';
import WithUpdateConfirmation from '../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import stringify from 'safe-stable-stringify';

const policy = 'deduplicationSnapshotInterval';

type PolicyValue = { type: 'inherited-from-broker-config' } | {
  type: 'specified-for-this-namespace',
  intervalSeconds: number;
};

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const { namespaceServiceClient } = PulsarGrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig()

  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: initialValue, error: initialValueError } = useSWR(
    swrKey,
    async () => {
      const req = new pb.GetDeduplicationSnapshotIntervalRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);

      const res = await namespaceServiceClient.getDeduplicationSnapshotInterval(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get deduplication snapshot interval: ${res.getStatus()?.getMessage()}`);
      }

      let value: PolicyValue = { type: 'inherited-from-broker-config' };
      switch (res.getIntervalCase()) {
        case pb.GetDeduplicationSnapshotIntervalResponse.IntervalCase.DISABLED: {
          value = { type: 'inherited-from-broker-config' };
          break;
        }
        case pb.GetDeduplicationSnapshotIntervalResponse.IntervalCase.ENABLED: {
          value = { type: 'specified-for-this-namespace', intervalSeconds: res.getEnabled()?.getInterval() || 0 };
        }
      }

      return value;
    }
  );

  if (initialValueError) {
    notifyError(`Unable to get deduplication snapshot interval: ${initialValueError}`);
  }

  if (initialValue === undefined) {
    return null;
  }


  return (
    <WithUpdateConfirmation<PolicyValue>
      key={stringify(initialValue)}
      initialValue={initialValue}
      onConfirm={async (value) => {
        if (value.type === 'inherited-from-broker-config') {
          const req = new pb.RemoveDeduplicationSnapshotIntervalRequest();
          req.setNamespace(`${props.tenant}/${props.namespace}`);
          const res = await namespaceServiceClient.removeDeduplicationSnapshotInterval(req, {}).catch((err) => notifyError(`Unable to remove deduplication snapshot interval: ${err}`));
          if (res !== undefined && res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to remove deduplication snapshot interval: ${res.getStatus()?.getMessage()}`);
          }
        }

        if (value.type === 'specified-for-this-namespace') {
          const maxInt32 = 2_147_483_647;
          if (value.intervalSeconds > maxInt32) {
            notifyError(`Unable to set deduplication snapshot interval. It should be less than ${new Intl.NumberFormat('en-US').format(maxInt32)} seconds`);
            return;
          }

          const req = new pb.SetDeduplicationSnapshotIntervalRequest();
          req.setNamespace(`${props.tenant}/${props.namespace}`);
          req.setInterval(Math.floor(value.intervalSeconds));
          const res = await namespaceServiceClient.setDeduplicationSnapshotInterval(req, {}).catch((err) => notifyError(`Unable to set deduplication snapshot interval: ${err}`));
          if (res !== undefined && res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set deduplication snapshot interval: ${res.getStatus()?.getMessage()}`);
          }
        }

        mutate(swrKey);
      }}
    >
      {({ value, onChange }) => {
        return (
          <>
            <div className={sf.FormItem}>
              <Select<PolicyValue['type']>
                value={value.type}
                onChange={(type) => onChange(type === 'inherited-from-broker-config' ? { type: 'inherited-from-broker-config' } : { type: 'specified-for-this-namespace', intervalSeconds: 0 })}
                list={[
                  { type: 'item', value: 'inherited-from-broker-config', title: 'Inherited from broker config' },
                  { type: 'item', value: 'specified-for-this-namespace', title: 'Specified for this namespace' }
                ]}
              />
            </div>
            {value.type === 'specified-for-this-namespace' && (
              <DurationInput
                value={value.intervalSeconds}
                onChange={(duration) => onChange({ ...value, intervalSeconds: duration })}
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
  title: 'Deduplication snapshot interval',
  description: <span>Deduplication snapshot interval. <code>brokerDeduplicationEnabled</code> must be set to true for this property to take effect.</span>,
  input: <FieldInput {...props} />
});

export default field;
