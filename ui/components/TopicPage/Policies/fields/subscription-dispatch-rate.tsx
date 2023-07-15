import * as Notifications from '../../../app/contexts/Notifications';
import * as GrpcClient from '../../../app/contexts/GrpcClient/GrpcClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import sf from '../../../ui/ConfigurationTable/form.module.css';
import Select from '../../../ui/Select/Select';
import Input from "../../../ui/Input/Input";
import { swrKeys } from '../../../swrKeys';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/topicpolicies/v1/topicpolicies_pb';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import WithUpdateConfirmation from '../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation';
import stringify from 'safe-stable-stringify';

const policy = 'subscriptionDispatchRate';

type PolicyValue = {
  type: 'inherited-from-namespace-config'
} | {
  type: 'specified',
  rateInMsg: number;
  rateInByte: number;
  isRelativeToPublishRate: boolean;
  periodInSecond: number;
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
    swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy, isGlobal: props.isGlobal }) :
    swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy, isGlobal: props.isGlobal });

  const { data: initialValue, error: initialValueError } = useSWR(
    swrKey,
    async () => {
      const req = new pb.GetSubscriptionDispatchRateRequest();
      req.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
      req.setIsGlobal(props.isGlobal);

      const res = await topicPoliciesServiceClient.getSubscriptionDispatchRate(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get dispatch rate. ${res.getStatus()?.getMessage()}`);
        return;
      }

      let initialValue: PolicyValue = { type: 'inherited-from-namespace-config' };
      switch (res.getSubscriptionDispatchRateCase()) {
        case pb.GetSubscriptionDispatchRateResponse.SubscriptionDispatchRateCase.UNSPECIFIED: {
          initialValue = { type: 'inherited-from-namespace-config' };
          break;
        }
        case pb.GetSubscriptionDispatchRateResponse.SubscriptionDispatchRateCase.SPECIFIED: {
          const subscriptionDispatchRate = res.getSpecified()!;
          initialValue = {
            type: 'specified',
            rateInMsg: subscriptionDispatchRate.getRateInMsg(),
            rateInByte: subscriptionDispatchRate.getRateInByte(),
            isRelativeToPublishRate: subscriptionDispatchRate.getIsRelativeToPublishRate(),
            periodInSecond: subscriptionDispatchRate.getPeriodInSecond(),
          }
          break;
        }
      }

      return initialValue;
    }
  );

  if (initialValueError) {
    notifyError(`Unable to get dispatch rate. ${initialValueError}`);
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
          const req = new pb.RemoveSubscriptionDispatchRateRequest();
          req.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
          req.setIsGlobal(props.isGlobal);

          const res = await topicPoliciesServiceClient.removeSubscriptionDispatchRate(req, {});
          if (res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set dispatch rate. ${res.getStatus()?.getMessage()}`);
          }
        }

        if (value.type === 'specified') {
          const req = new pb.SetSubscriptionDispatchRateRequest();
          req.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
          req.setIsGlobal(props.isGlobal);
          req.setRateInMsg(value.rateInMsg);
          req.setRateInByte(value.rateInByte);
          req.setPeriodInSecond(value.periodInSecond);
          req.setIsRelativeToPublishRate(value.isRelativeToPublishRate);

          const res = await topicPoliciesServiceClient.setSubscriptionDispatchRate(req, {});
          if (res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set dispatch rate. ${res.getStatus()?.getMessage()}`);
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
                  { type: 'item', value: 'specified', title: 'Specified' },
                ]}
                value={value.type}
                onChange={(type) => {
                  if (type === 'inherited-from-namespace-config') {
                    onChange({ type });
                  }
                  if (type === 'specified') {
                    onChange({
                      type,
                      rateInMsg: -1,
                      rateInByte: -1,
                      isRelativeToPublishRate: false,
                      periodInSecond: 1,
                    });
                  }
                }}
              />
            </div>
            {value.type === 'specified' && (
              <div>
                <div className={sf.FormItem}>
                  <div className={sf.FormLabel}>Byte dispatch rate</div>
                  <Input value={String(value.rateInByte)} onChange={v => onChange({ ...value, rateInByte: Math.floor(Number(v)) })} type='number' />
                </div>
                <div className={sf.FormItem}>
                  <div className={sf.FormLabel}>Msg. dispatch rate</div>
                  <Input value={String(value.rateInMsg)} onChange={v => onChange({ ...value, rateInMsg: Math.floor(Number(v)) })} type='number' />
                </div>
                <div className={sf.FormItem}>
                  <div className={sf.FormLabel}>Period in seconds</div>
                  <Input value={String(value.periodInSecond)} onChange={v => onChange({ ...value, periodInSecond: Math.floor(Number(v)) })} type='number' />
                </div>
                <div className={sf.FormItem}>
                  <div className={sf.FormLabel}>Is relative to publish rate</div>
                  <Select<'true' | 'false'>
                    list={[
                      { type: 'item', value: 'true', title: 'True' },
                      { type: 'item', value: 'false', title: 'False' },
                    ]}
                    value={value.isRelativeToPublishRate ? 'true' : 'false'}
                    onChange={v => onChange({ ...value, isRelativeToPublishRate: v === 'true' })}
                  />
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
  title: 'Subscription dispatch rate',
  description: <span>Set subscription message-dispatch-rate for all topics of the topic.</span>,
  input: <FieldInput {...props} />
});

export default field;
