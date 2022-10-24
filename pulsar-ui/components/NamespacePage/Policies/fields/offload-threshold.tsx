import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import MemorySizeInput from '../../../ui/ConfigurationTable/MemorySizeInput/MemorySizeInput';
import Select from '../../../ui/Select/Select';
import sf from '../../../ui/ConfigurationTable/form.module.css';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb';
import { swrKeys } from '../../../swrKeys';
import WithUpdateConfirmation from '../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import { useState } from 'react';

const policy = 'offloadThreshold';

type PolicyValue =
  {
    type: 'disabled'
  } |
  {
    type: 'specified-for-this-namespace',
    offloadThresholdBytes: number,
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
      const req = new pb.GetOffloadThresholdRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);

      const res = await namespaceServiceClient.getOffloadThreshold(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get offload threshold: ${res.getStatus()?.getMessage()}`);
        return;
      }

      let initialValue: PolicyValue = { type: 'disabled' };
      switch (res.getOffloadThresholdCase()) {
        case pb.GetOffloadThresholdResponse.OffloadThresholdCase.SPECIFIED: {
          const offloadThresholdBytes = res.getSpecified()?.getOffloadThresholdBytes() ?? 0

          if (offloadThresholdBytes < 0) {
            initialValue = { type: 'disabled' };
          } else {
            initialValue = { type: 'specified-for-this-namespace', offloadThresholdBytes: offloadThresholdBytes };
          }

          break;
        }
      }

      return initialValue;
    }
  );

  if (initialValueError) {
    notifyError(`Unable to get offload threshold ${initialValueError}`);
  }

  if (initialValue === undefined) {
    return null;
  }

  return (
    <WithUpdateConfirmation<PolicyValue>
      key={key}
      initialValue={initialValue}
      onConfirm={async (value) => {
        if (value.type === 'disabled' || value.type === 'specified-for-this-namespace') {
          const req = new pb.SetOffloadThresholdRequest();
          req.setNamespace(`${props.tenant}/${props.namespace}`);

          if (value.type === 'disabled') {
            req.setOffloadThresholdBytes(-1);
          }

          if (value.type === 'specified-for-this-namespace') {
            req.setOffloadThresholdBytes(Math.floor(value.offloadThresholdBytes));
          }

          const res = await namespaceServiceClient.setOffloadThreshold(req, {});
          if (res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set offload threshold: ${res.getStatus()?.getMessage()}`);
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
                  { type: 'item', value: 'disabled', title: 'Disabled' },
                  { type: 'item', value: 'specified-for-this-namespace', title: 'Specified for this namespace' },
                ]}
                onChange={(v) => {
                  switch (v) {
                    case 'disabled': onChange({ type: 'disabled' }); break;
                    case 'specified-for-this-namespace': onChange({ type: 'specified-for-this-namespace', offloadThresholdBytes: 1 }); break;
                  }
                }}
                value={value.type}
              />
            </div>
            {value.type === 'specified-for-this-namespace' && (
              <MemorySizeInput
                initialValue={value.offloadThresholdBytes}
                onChange={v => onChange({ type: 'specified-for-this-namespace', offloadThresholdBytes: v })}
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
  title: 'Offload threshold',
  description: <span>Maximum number of bytes stored in the pulsar cluster for a topic before data will start being automatically offloaded to long-term storage. 0 triggers offloading as soon as possible.</span>,
  input: <FieldInput {...props} />
});

export default field;
