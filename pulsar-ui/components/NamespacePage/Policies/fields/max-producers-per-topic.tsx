import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import Input from '../../../ui/Input/Input';
import Select from '../../../ui/Select/Select';
import sf from '../../../ui/ConfigurationTable/form.module.css';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb';
import { swrKeys } from '../../../swrKeys';
import WithUpdateConfirmation from '../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';

const policy = 'maxProducersPerTopic';

type PolicyValue = { type: 'inherited-from-broker-config' } | { type: 'unlimited' } | {
  type: 'specified-for-this-namespace',
  maxProducersPerTopic: number,
};

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const { namespaceServiceClient } = PulsarGrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();

  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: initialValue, error: initialValueError } = useSWR(
    swrKey,
    async () => {
      const req = new pb.GetMaxProducersPerTopicRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);

      const res = await namespaceServiceClient.getMaxProducersPerTopic(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(res.getStatus()?.getMessage());
        return;
      }

      let initialValue: PolicyValue = { type: 'inherited-from-broker-config' };
      switch (res.getMaxProducersPerTopicCase()) {
        case pb.GetMaxProducersPerTopicResponse.MaxProducersPerTopicCase.UNSPECIFIED: {
          initialValue = { type: 'inherited-from-broker-config' };
          break;
        }
        case pb.GetMaxProducersPerTopicResponse.MaxProducersPerTopicCase.SPECIFIED: {
          const maxProducersPerTopic = res.getSpecified()?.getMaxProducersPerTopic() ?? 0;

          if (maxProducersPerTopic === 0) {
            initialValue = { type: 'unlimited' };
          } else {
            initialValue = { type: 'specified-for-this-namespace', maxProducersPerTopic };
          }

          break;
        }
      }

      return initialValue;
    }
  );

  if (initialValueError) {
    notifyError(`Unable to get max producers per topic. ${initialValueError}`);
  }

  if (initialValue === undefined) {
    return null;
  }

  return (
    <WithUpdateConfirmation<PolicyValue>
      initialValue={initialValue}
      onConfirm={async (value) => {
        if (value.type === 'inherited-from-broker-config') {
          const req = new pb.RemoveMaxProducersPerTopicRequest();
          req.setNamespace(`${props.tenant}/${props.namespace}`);

          const res = await namespaceServiceClient.removeMaxProducersPerTopic(req, {});
          if (res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set max subscriptions per topic: ${res.getStatus()?.getMessage()}`);
          }
        }

        if (value.type === 'unlimited' || value.type === 'specified-for-this-namespace') {
          const req = new pb.SetMaxProducersPerTopicRequest();
          req.setNamespace(`${props.tenant}/${props.namespace}`);

          if (value.type === 'unlimited') {
            req.setMaxProducersPerTopic(0);
          }

          if (value.type === 'specified-for-this-namespace') {
            req.setMaxProducersPerTopic(value.maxProducersPerTopic);
          }

          const res = await namespaceServiceClient.setMaxProducersPerTopic(req, {});
          if (res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set max subscriptions per topic: ${res.getStatus()?.getMessage()}`);
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
                list={[
                  { type: 'item', value: 'inherited-from-broker-config', title: 'Inherited from broker config' },
                  { type: 'item', value: 'unlimited', title: 'Unlimited' },
                  { type: 'item', value: 'specified-for-this-namespace', title: 'Specified for this namespace' },
                ]}
                onChange={(v) => {
                  switch (v) {
                    case 'inherited-from-broker-config': onChange({ type: 'inherited-from-broker-config' }); break;
                    case 'unlimited': onChange({ type: 'unlimited' }); break;
                    case 'specified-for-this-namespace': onChange({ type: 'specified-for-this-namespace', maxProducersPerTopic: 1 }); break;
                  }
                }}
                value={value.type}
              />
            </div>
            {value.type === 'specified-for-this-namespace' && (
              <Input
                type="number"
                value={value.maxProducersPerTopic.toString()}
                onChange={v => onChange({ type: 'specified-for-this-namespace', maxProducersPerTopic: parseInt(v) })}
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
  title: 'Max producers per topic',
  description: <span>Max producers per topic.</span>,
  input: <FieldInput {...props} />
});

export default field;
