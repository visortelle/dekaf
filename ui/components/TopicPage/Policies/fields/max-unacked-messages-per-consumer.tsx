import useSWR, { useSWRConfig } from "swr";
import stringify from "safe-stable-stringify";

import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import Input from '../../../ui/Input/Input';
import Select from '../../../ui/Select/Select';
import sf from '../../../ui/ConfigurationTable/form.module.css';
import WithUpdateConfirmation from '../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/topicpolicies/v1/topicpolicies_pb';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import { swrKeys } from '../../../swrKeys';

const policy = 'maxUnackedMessagesPerConsumer';

type PolicyValue = { type: 'inherited-from-namespace-config' } | { type: 'unlimited' } | {
  type: 'specified-for-this-topic',
  maxUnackedMessagesOnConsumer: number,
};

export type FieldInputProps = {
  topicType: 'persistent' | 'non-persistent';
  tenant: string;
  namespace: string;
  topic: string;
  isGlobal: boolean;
}

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const { topicpoliciesServiceClient } = PulsarGrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();

  const swrKey = props.topicType === 'persistent' ?
    swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy, isGlobal: props.isGlobal }) :
    swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy, isGlobal: props.isGlobal });

  const { data: initialValue, error: initialValueError } = useSWR(
    swrKey,
    async () => {
      const req = new pb.GetMaxUnackedMessagesOnConsumerRequest();
      req.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
      req.setIsGlobal(props.isGlobal);
      const res = await topicpoliciesServiceClient.getMaxUnackedMessagesOnConsumer(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get max unacked messages on consumer: ${res.getStatus()?.getMessage()}`);
        return;
      }

      let initialValue: PolicyValue = { type: 'inherited-from-namespace-config' };
      switch (res.getMaxUnackedMessagesOnConsumerCase()) {
        case pb.GetMaxUnackedMessagesOnConsumerResponse.MaxUnackedMessagesOnConsumerCase.UNSPECIFIED: {
          initialValue = { type: 'inherited-from-namespace-config' };
          break;
        }
        case pb.GetMaxUnackedMessagesOnConsumerResponse.MaxUnackedMessagesOnConsumerCase.SPECIFIED: {
          const maxUnackedMessagesOnConsumer = res.getSpecified()?.getMaxUnackedMessagesOnConsumer() ?? 0;

          if (maxUnackedMessagesOnConsumer === 0) {
            initialValue = { type: 'unlimited' };
          } else {
            initialValue = { type: 'specified-for-this-topic', maxUnackedMessagesOnConsumer };
          }

          break;
        }
      }

      return initialValue;
    }
  );

  if (initialValueError) {
    notifyError(`Unable to get max unacked messages on consumer. ${initialValueError}`);
  }

  if (initialValue === undefined) {
    return null;
  }

  const updatePolicy = async (value: PolicyValue) => {
    if (value.type === 'inherited-from-namespace-config') {
      const req = new pb.RemoveMaxUnackedMessagesOnConsumerRequest();
      req.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
      req.setIsGlobal(props.isGlobal);

      const res = await topicpoliciesServiceClient.removeMaxUnackedMessagesOnConsumer(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to set max unacked messages on consumer: ${res.getStatus()?.getMessage()}`);
      }
    }

    if (value.type === 'unlimited' || value.type === 'specified-for-this-topic') {
      const req = new pb.SetMaxUnackedMessagesOnConsumerRequest();
      req.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
      req.setIsGlobal(props.isGlobal);

      if (value.type === 'unlimited') {
        req.setMaxUnackedMessagesOnConsumer(0);
      }

      if (value.type === 'specified-for-this-topic') {
        req.setMaxUnackedMessagesOnConsumer(value.maxUnackedMessagesOnConsumer);
      }

      const res = await topicpoliciesServiceClient.setMaxUnackedMessagesOnConsumer(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to set max unacked messages on consumer: ${res.getStatus()?.getMessage()}`);
      }
    }

    // XXX Fix outdated input state after first update of any topic's policy in a new namespace.
    setTimeout(() => mutate(swrKey), 300);
  }

  return (
    <WithUpdateConfirmation<PolicyValue>
      key={stringify(initialValue)}
      initialValue={initialValue}
      onConfirm={updatePolicy}
    >
      {({ value, onChange }) => {
        return (
          <>
            <div className={sf.FormItem}>
              <Select<PolicyValue['type']>
                list={[
                  { type: 'item', value: 'inherited-from-namespace-config', title: 'Inherited from namespace config' },
                  { type: 'item', value: 'unlimited', title: 'Unlimited' },
                  { type: 'item', value: 'specified-for-this-topic', title: 'Specified for this topic' },
                ]}
                onChange={(v) => {
                  switch (v) {
                    case 'inherited-from-namespace-config': onChange({ type: 'inherited-from-namespace-config' }); break;
                    case 'unlimited': onChange({ type: 'unlimited' }); break;
                    case 'specified-for-this-topic': onChange({ type: 'specified-for-this-topic', maxUnackedMessagesOnConsumer: 1 }); break;
                  }
                }}
                value={value.type}
              />
            </div>
            {value.type === 'specified-for-this-topic' && (
              <Input
                type="number"
                value={value.maxUnackedMessagesOnConsumer.toString()}
                onChange={v => onChange({ type: 'specified-for-this-topic', maxUnackedMessagesOnConsumer: parseInt(v) })}
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
  title: 'Max unacked messages per consumer',
  description: <span>Max unacked messages per consumer.</span>,
  input: <FieldInput {...props} />
});

export default field;
