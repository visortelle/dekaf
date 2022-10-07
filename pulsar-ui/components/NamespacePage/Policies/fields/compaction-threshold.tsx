import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import Select from '../../../ui/Select/Select';
import sf from '../../../ui/ConfigurationTable/form.module.css';
import { MemorySize } from '../../../ui/ConfigurationTable/MemorySizeInput/types';
import { bytesToMemorySize, memorySizeToBytes } from '../../../ui/ConfigurationTable/MemorySizeInput/conversions';
import MemorySizeInput from '../../../ui/ConfigurationTable/MemorySizeInput/MemorySizeInput';
import { swrKeys } from '../../../swrKeys';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import WithUpdateConfirmation from '../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation';

const policy = 'compactionThreshold';

type PolicyValue = { type: 'disabled' } | {
  type: 'enabled',
  size: MemorySize;
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

  const { data: policyValue, error: setPolicyValue } = useSWR(
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

      let value: PolicyValue = { type: 'disabled' };
      switch (res.getThresholdCase()) {
        case pb.GetCompactionThresholdResponse.ThresholdCase.DISABLED: {
          value = { type: 'disabled' };
          break;
        }
        case pb.GetCompactionThresholdResponse.ThresholdCase.ENABLED: {
          value = { type: 'enabled', size: bytesToMemorySize(res.getEnabled()?.getThreshold() || 0) };
          break;
        }
      }

      return value;
    }
  );

  if (setPolicyValue) {
    notifyError(`Unable to get compaction threshold policy. ${setPolicyValue}`);
  }

  if (policyValue === undefined) {
    return null;
  }

  return (
    <WithUpdateConfirmation
      initialValue={policyValue}
      onConfirm={async (value) => {
        switch (value.type) {
          case 'disabled': {
            const req = new pb.DeleteCompactionThresholdRequest();
            req.setNamespace(`${props.tenant}/${props.namespace}`);

            const res = await namespaceServiceClient.deleteCompactionThreshold(req, {})
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
          case 'enabled': {
            const req = new pb.SetCompactionThresholdRequest();
            req.setNamespace(`${props.tenant}/${props.namespace}`);
            req.setThreshold(memorySizeToBytes(value.size));

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

        mutate(swrKey);
      }}
    >
      {({ value, onChange }) => (
        <>
          <div className={sf.FormItem}>
            <Select<PolicyValue['type']>
              list={[
                { type: 'item', title: 'Disabled', value: 'disabled' },
                { type: 'item', title: 'Enabled', value: 'enabled' },
              ]}
              value={value.type}
              onChange={(type) => onChange(type === 'disabled' ? { type: 'disabled' } : { type: 'enabled', size: { size: 0, unit: 'B' } })}
            />
          </div>
          {value.type === 'enabled' && (
            <MemorySizeInput
              value={value.size}
              onChange={(size) => onChange({ ...value, size })}
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
