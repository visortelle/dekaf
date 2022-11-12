import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import Select from '../../../ui/Select/Select';
import sf from '../../../ui/ConfigurationTable/form.module.css';
import MemorySizeInput from '../../../ui/ConfigurationTable/MemorySizeInput/MemorySizeInput';
import { swrKeys } from '../../../swrKeys';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import WithUpdateConfirmation from '../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation';
import stringify from 'safe-stable-stringify';

const policy = 'compactionThreshold';

type PolicyValue = { type: 'inherited-from-broker-config' } | {
  type: 'specified-for-this-namespace',
  sizeBytes: number;
} | {
  type: 'automatic-compaction-disabled'
};

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const { namespaceServiceClient } = PulsarGrpcClient.useContext()
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig()

  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: initialValue, error: initialValueError } = useSWR(
    swrKey,
    async () => {
      const req = new pb.GetCompactionThresholdRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);
      const res = await namespaceServiceClient.getCompactionThreshold(req, {});
      if (res === undefined) {
        return;
      }

      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(res.getStatus()?.getMessage());
        return;
      }

      let value: PolicyValue = { type: 'inherited-from-broker-config' };
      switch (res.getThresholdCase()) {
        case pb.GetCompactionThresholdResponse.ThresholdCase.DISABLED: {
          value = { type: 'inherited-from-broker-config' };
          break;
        }
        case pb.GetCompactionThresholdResponse.ThresholdCase.ENABLED: {
          const threshold = res.getEnabled()?.getThreshold() || 0;
          value = threshold === 0 ? { type: 'automatic-compaction-disabled' } : { type: 'specified-for-this-namespace', sizeBytes: threshold };
          break;
        }
      }

      return value;
    }
  );

  if (initialValueError) {
    notifyError(`Unable to get compaction threshold policy. ${initialValueError}`);
  }

  if (initialValue === undefined) {
    return null;
  }

  return (
    <WithUpdateConfirmation<PolicyValue>
      key={stringify(initialValue)}
      initialValue={initialValue}
      onConfirm={async (value) => {
        switch (value.type) {
          case 'inherited-from-broker-config': {
            const req = new pb.RemoveCompactionThresholdRequest();
            req.setNamespace(`${props.tenant}/${props.namespace}`);

            const res = await namespaceServiceClient.removeCompactionThreshold(req, {})
              .catch((err) => notifyError(`Unable to disable compaction threshold policy. ${err}`));

            if (res === undefined) {
              return;
            }
            if (res.getStatus()?.getCode() !== Code.OK) {
              notifyError(res.getStatus()?.getMessage());
              return;
            }

            break;
          }
          case 'specified-for-this-namespace': {
            const req = new pb.SetCompactionThresholdRequest();
            req.setNamespace(`${props.tenant}/${props.namespace}`);
            req.setThreshold(Math.floor(value.sizeBytes));

            const res = await namespaceServiceClient.setCompactionThreshold(req, {});
            if (res === undefined) {
              return;
            }
            if (res.getStatus()?.getCode() !== Code.OK) {
              notifyError(res.getStatus()?.getMessage());
              return;
            }

            break;
          }
          case 'automatic-compaction-disabled': {
            const req = new pb.SetCompactionThresholdRequest();
            req.setNamespace(`${props.tenant}/${props.namespace}`);
            req.setThreshold(0);

            const res = await namespaceServiceClient.setCompactionThreshold(req, {});
            if (res === undefined) {
              return;
            }
            if (res.getStatus()?.getCode() !== Code.OK) {
              notifyError(res.getStatus()?.getMessage());
              return;
            }

            break;
          }
        }
        await mutate(swrKey);
      }}
    >
      {({ value, onChange }) => (
        <>
          <div className={sf.FormItem}>
            <Select<PolicyValue['type']>
              list={[
                { type: 'item', title: 'Inherited from broker config', value: 'inherited-from-broker-config' },
                { type: 'item', title: 'Automatic compaction disabled', value: 'automatic-compaction-disabled' },
                { type: 'item', title: 'Specified for this namespace', value: 'specified-for-this-namespace' },
              ]}
              value={value.type}
              onChange={(type) => {
                if (type === 'specified-for-this-namespace') {
                  onChange({
                    type: 'specified-for-this-namespace', sizeBytes: 1024
                  });
                  return;
                }

                onChange({ type });
              }}
            />
          </div>
          {value.type === 'specified-for-this-namespace' && (
            <MemorySizeInput
              initialValue={value.sizeBytes}
              onChange={(size) => {
                if (size > 0) {
                  onChange({ ...value, sizeBytes: size })
                }
              }}
            />
          )}
        </>
      )}
    </WithUpdateConfirmation>
  )
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Compaction threshold',
  description: <span>Set compactionThreshold for a namespace.</span>,
  input: <FieldInput {...props} />
});

export default field;
