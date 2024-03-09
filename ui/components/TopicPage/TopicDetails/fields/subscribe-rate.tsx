import stringify from 'safe-stable-stringify';

import * as Notifications from '../../../app/contexts/Notifications';
import * as GrpcClient from '../../../app/contexts/GrpcClient/GrpcClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import sf from '../../../ui/ConfigurationTable/form.module.css';
import Select from '../../../ui/Select/Select';
import Input from "../../../ui/Input/Input";
import { swrKeys } from '../../../swrKeys';
import * as pb from "../../../../grpc-web/tools/teal/pulsar/ui/topic_policies/v1/topic_policies_pb";
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import WithUpdateConfirmation from '../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation';
import { PulsarTopicPersistency } from '../../../pulsar/pulsar-resources';
import NoData from '../../../ui/NoData/NoData';

const policy = 'subscribeRate';

type PolicyValue = {
  type: 'inherited-from-namespace-config'
} | {
  type: 'specified-for-this-topic',
  subscribeThrottlingRatePerConsumer: number;
  ratePeriodInSeconds: number;
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
      const req = new pb.GetSubscribeRateRequest();
      req.setTopic(`${props.topicPersistency}://${props.tenant}/${props.namespace}/${props.topic}`);
      req.setIsGlobal(props.isGlobal);

      const res = await topicPoliciesServiceClient.getSubscribeRate(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get subscribe rate. ${res.getStatus()?.getMessage()}`);
        return;
      }

      let initialValue: PolicyValue = { type: 'inherited-from-namespace-config' };
      switch (res.getSubscribeRateCase()) {
        case pb.GetSubscribeRateResponse.SubscribeRateCase.UNSPECIFIED: {
          initialValue = { type: 'inherited-from-namespace-config' };
          break;
        }
        case pb.GetSubscribeRateResponse.SubscribeRateCase.SPECIFIED: {
          const subscribeRate = res.getSpecified()!;
          initialValue = {
            type: 'specified-for-this-topic',
            subscribeThrottlingRatePerConsumer: subscribeRate.getSubscribeThrottlingRatePerConsumer(),
            ratePeriodInSeconds: subscribeRate.getRatePeriodInSeconds(),
          }
          break;
        }
      }

      return initialValue;
    }
  );

  if (initialValueError) {
    notifyError(`Unable to get subscribe rate. ${initialValueError}`);
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
          const req = new pb.RemoveSubscribeRateRequest();
          req.setTopic(`${props.topicPersistency}://${props.tenant}/${props.namespace}/${props.topic}`);
          req.setIsGlobal(props.isGlobal);

          const res = await topicPoliciesServiceClient.removeSubscribeRate(req, {});
          if (res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set subscribe rate. ${res.getStatus()?.getMessage()}`);
          }
        }

        if (value.type === 'specified-for-this-topic') {
          const req = new pb.SetSubscribeRateRequest();
          req.setTopic(`${props.topicPersistency}://${props.tenant}/${props.namespace}/${props.topic}`);
          req.setIsGlobal(props.isGlobal);
          req.setSubscribeThrottlingRatePerConsumer(value.subscribeThrottlingRatePerConsumer);
          req.setRatePeriodInSeconds(value.ratePeriodInSeconds);

          const res = await topicPoliciesServiceClient.setSubscribeRate(req, {});
          if (res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set subscribe rate. ${res.getStatus()?.getMessage()}`);
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
                  { type: 'item', value: 'specified-for-this-topic', title: 'Specified for this topic' },
                ]}
                value={value.type}
                onChange={(type) => {
                  if (type === 'inherited-from-namespace-config') {
                    onChange({ type });
                  }
                  if (type === 'specified-for-this-topic') {
                    onChange({
                      type,
                      subscribeThrottlingRatePerConsumer: -1,
                      ratePeriodInSeconds: 30,
                    });
                  }
                }}
              />
            </div>
            {value.type === 'specified-for-this-topic' && (
              <div>
                <div className={sf.FormItem}>
                  <div className={sf.FormLabel}>Rate period in seconds</div>
                  <Input value={String(value.ratePeriodInSeconds)} onChange={v => onChange({ ...value, ratePeriodInSeconds: Math.floor(Number(v)) })} type='number' />
                </div>
                <div className={sf.FormItem}>
                  <div className={sf.FormLabel}>Subscribe throttling rate per consumer</div>
                  <Input value={String(value.subscribeThrottlingRatePerConsumer)} onChange={v => onChange({ ...value, subscribeThrottlingRatePerConsumer: Math.floor(Number(v)) })} type='number' />
                </div>
              </div>
            )}
          </>
        );
      }}
    </WithUpdateConfirmation>
  )
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Subscribe rate',
  description: <NoData />,
  input: <FieldInput {...props} />
});

export default field;
