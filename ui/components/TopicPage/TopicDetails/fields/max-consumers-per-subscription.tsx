import stringify from "safe-stable-stringify";

import * as Notifications from '../../../app/contexts/Notifications';
import * as GrpcClient from '../../../app/contexts/GrpcClient/GrpcClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import Input from '../../../ui/Input/Input';
import Select from '../../../ui/Select/Select';
import sf from '../../../ui/ConfigurationTable/form.module.css';
import * as pb from "../../../../grpc-web/tools/teal/pulsar/ui/topic_policies/v1/topic_policies_pb";
import { swrKeys } from '../../../swrKeys';
import WithUpdateConfirmation from '../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import { PulsarTopicPersistency } from "../../../pulsar/pulsar-resources";

const policy = 'maxConsumersPerSubscription';

type PolicyValue = { type: 'inherited-from-namespace-config' } |
{ type: 'unlimited' } | {
  type: 'specified-for-this-topic',
  maxConsumersPerSubscription: number,
};

export type FieldInputProps = {
  topicPersistency: PulsarTopicPersistency;
  tenant: string;
  namespace: string;
  topic: string;
  isGlobal: boolean;
}

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const { topicPoliciesServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();

  const swrKey = props.topicPersistency === 'persistent' ?
    swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy, isGlobal: props.isGlobal }) :
    swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy, isGlobal: props.isGlobal });

  const { data: initialValue, error: initialValueError } = useSWR(
    swrKey,
    async () => {
      const req = new pb.GetMaxConsumersPerSubscriptionRequest();
      req.setTopic(`${props.topicPersistency}://${props.tenant}/${props.namespace}/${props.topic}`);
      req.setIsGlobal(props.isGlobal);

      const res = await topicPoliciesServiceClient.getMaxConsumersPerSubscription(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get max consumers per subscriptions: ${res.getStatus()?.getMessage()}`);
        return;
      }

      let initialValue: PolicyValue = { type: 'inherited-from-namespace-config' };
      switch (res.getMaxConsumersPerSubscriptionCase()) {
        case pb.GetMaxConsumersPerSubscriptionResponse.MaxConsumersPerSubscriptionCase.UNSPECIFIED: {
          initialValue = { type: 'inherited-from-namespace-config' };
          break;
        }
        case pb.GetMaxConsumersPerSubscriptionResponse.MaxConsumersPerSubscriptionCase.SPECIFIED: {
          const maxConsumersPerSubscription = res.getSpecified()?.getMaxConsumersPerSubscription() ?? 0;

          if (maxConsumersPerSubscription === 0) {
            initialValue = { type: 'unlimited' };
          } else {
            initialValue = { type: 'specified-for-this-topic', maxConsumersPerSubscription };
          }

          break;
        }
      }

      return initialValue;
    }
  );

  if (initialValueError) {
    notifyError(`Unable to get max consumers per subscription. ${initialValueError}`);
  }

  if (initialValue === undefined) {
    return null;
  }

  return (
    <WithUpdateConfirmation<PolicyValue>
      key={stringify(initialValue)}
      initialValue={initialValue}
      onConfirm={async (value) => {
        if (value.type === 'inherited-from-namespace-config') {
          const req = new pb.RemoveMaxConsumersPerSubscriptionRequest();
          req.setTopic(`${props.topicPersistency}://${props.tenant}/${props.namespace}/${props.topic}`);
          req.setIsGlobal(props.isGlobal);

          const res = await topicPoliciesServiceClient.removeMaxConsumersPerSubscription(req, {});
          if (res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set max subscriptions per topic: ${res.getStatus()?.getMessage()}`);
          }
        }

        if (value.type === 'unlimited' || value.type === 'specified-for-this-topic') {
          const req = new pb.SetMaxConsumersPerSubscriptionRequest();
          req.setTopic(`${props.topicPersistency}://${props.tenant}/${props.namespace}/${props.topic}`);
          req.setIsGlobal(props.isGlobal);

          if (value.type === 'unlimited') {
            req.setMaxConsumersPerSubscription(0);
          }

          if (value.type === 'specified-for-this-topic') {
            req.setMaxConsumersPerSubscription(value.maxConsumersPerSubscription);
          }

          const res = await topicPoliciesServiceClient.setMaxConsumersPerSubscription(req, {});
          if (res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set max subscriptions per topic: ${res.getStatus()?.getMessage()}`);
          }
        }

        setTimeout(async () => {
          await mutate(swrKey);
        }, 300);
      }}
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
                    case 'specified-for-this-topic': onChange({ type: 'specified-for-this-topic', maxConsumersPerSubscription: 1 }); break;
                  }
                }}
                value={value.type}
              />
            </div>
            {value.type === 'specified-for-this-topic' && (
              <Input
                type="number"
                value={value.maxConsumersPerSubscription.toString()}
                onChange={v => onChange({ type: 'specified-for-this-topic', maxConsumersPerSubscription: parseInt(v) })}
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
  title: 'Max consumers per subscription',
  description: (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12rem' }}>
      <div>Limits a maximum number of consumers per subscription for this topic.</div>
      <div>
        A consumer is a process that attaches to a topic via a subscription and then receives messages.
      </div>
    </div>
  ),
  input: <FieldInput {...props} />
});

export default field;
