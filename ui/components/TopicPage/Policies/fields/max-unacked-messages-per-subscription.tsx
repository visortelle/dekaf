import useSWR, { useSWRConfig } from "swr";
import stringify from "safe-stable-stringify";

import * as Notifications from '../../../app/contexts/Notifications';
import * as GrpcClient from '../../../app/contexts/GrpcClient/GrpcClient';
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import Input from '../../../ui/Input/Input';
import Select from '../../../ui/Select/Select';
import sf from '../../../ui/ConfigurationTable/form.module.css';
import WithUpdateConfirmation from '../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/topic_policies/v1/topic_policies_pb';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import { swrKeys } from '../../../swrKeys';

const policy = 'maxUnackedMessagesPerSubscription';

type PolicyValue = { type: 'inherited-from-namespace-config' } | { type: 'unlimited' } | {
  type: 'specified-for-this-topic',
  maxUnackedMessagesOnSubscription: number,
};

export type FieldInputProps = {
  topicType: 'persistent' | 'non-persistent';
  tenant: string;
  namespace: string;
  topic: string;
  isGlobal: boolean;
}

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const { topicPoliciesServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();

  const swrKey = props.topicType === 'persistent' ?
    swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy, isGlobal: props.isGlobal }) :
    swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy, isGlobal: props.isGlobal });

  const { data: initialValue, error: initialValueError } = useSWR(
    swrKey,
    async () => {
      const req = new pb.GetMaxUnackedMessagesOnSubscriptionRequest();
      req.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
      req.setIsGlobal(props.isGlobal);

      const res = await topicPoliciesServiceClient.getMaxUnackedMessagesOnSubscription(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get max unacked messages on subscription: ${res.getStatus()?.getMessage()}`);
        return;
      }

      let initialValue: PolicyValue = { type: 'inherited-from-namespace-config' };
      switch (res.getMaxUnackedMessagesOnSubscriptionCase()) {
        case pb.GetMaxUnackedMessagesOnSubscriptionResponse.MaxUnackedMessagesOnSubscriptionCase.UNSPECIFIED: {
          initialValue = { type: 'inherited-from-namespace-config' };
          break;
        }
        case pb.GetMaxUnackedMessagesOnSubscriptionResponse.MaxUnackedMessagesOnSubscriptionCase.SPECIFIED: {
          const maxUnackedMessagesOnSubscription = res.getSpecified()?.getMaxUnackedMessagesOnSubscription() ?? 0;

          if (maxUnackedMessagesOnSubscription === 0) {
            initialValue = { type: 'unlimited' };
          } else {
            initialValue = { type: 'specified-for-this-topic', maxUnackedMessagesOnSubscription };
          }

          break;
        }
      }

      return initialValue;
    }
  );

  if (initialValueError) {
    notifyError(`Unable to get max unacked messages on subscription. ${initialValueError}`);
  }

  if (initialValue === undefined) {
    return null;
  }

  const updatePolicy = async (value: PolicyValue) => {
    if (value.type === 'inherited-from-namespace-config') {
      const req = new pb.RemoveMaxUnackedMessagesOnSubscriptionRequest();
      req.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
      req.setIsGlobal(props.isGlobal);

      const res = await topicPoliciesServiceClient.removeMaxUnackedMessagesOnSubscription(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to set max unacked messages on subscription: ${res.getStatus()?.getMessage()}`);
      }
    }

    if (value.type === 'unlimited' || value.type === 'specified-for-this-topic') {
      const req = new pb.SetMaxUnackedMessagesOnSubscriptionRequest();
      req.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
      req.setIsGlobal(props.isGlobal);

      if (value.type === 'unlimited') {
        req.setMaxUnackedMessagesOnSubscription(0);
      }

      if (value.type === 'specified-for-this-topic') {
        req.setMaxUnackedMessagesOnSubscription(value.maxUnackedMessagesOnSubscription);
      }

      const res = await topicPoliciesServiceClient.setMaxUnackedMessagesOnSubscription(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to set max unacked messages on subscription: ${res.getStatus()?.getMessage()}`);
      }
    }

    setTimeout(async () => {
      await mutate(swrKey)
    }, 300);
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
                    case 'specified-for-this-topic': onChange({ type: 'specified-for-this-topic', maxUnackedMessagesOnSubscription: 1 }); break;
                  }
                }}
                value={value.type}
              />
            </div>
            {value.type === 'specified-for-this-topic' && (
              <Input
                type="number"
                value={value.maxUnackedMessagesOnSubscription.toString()}
                onChange={v => onChange({ type: 'specified-for-this-topic', maxUnackedMessagesOnSubscription: parseInt(v) })}
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
  title: 'Max unacked messages per subscription',
  description: <span>Max unacked messages per subscription.</span>,
  input: <FieldInput {...props} />
});

export default field;
