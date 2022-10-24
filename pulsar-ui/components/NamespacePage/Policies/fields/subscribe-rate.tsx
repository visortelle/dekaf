import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import sf from '../../../ui/ConfigurationTable/form.module.css';
import Select from '../../../ui/Select/Select';
import Input from "../../../ui/Input/Input";
import { swrKeys } from '../../../swrKeys';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import WithUpdateConfirmation from '../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation';
import stringify from 'safe-stable-stringify';

const policy = 'subscribeRate';

type PolicyValue = {
  type: 'inherited-from-broker-config'
} | {
  type: 'specified',
  subscribeThrottlingRatePerConsumer: number;
  ratePeriodInSeconds: number;
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
      const req = new pb.GetSubscribeRateRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);

      const res = await namespaceServiceClient.getSubscribeRate(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get subscribe rate. ${res.getStatus()?.getMessage()}`);
        return;
      }

      let initialValue: PolicyValue = { type: 'inherited-from-broker-config' };
      switch (res.getSubscribeRateCase()) {
        case pb.GetSubscribeRateResponse.SubscribeRateCase.UNSPECIFIED: {
          initialValue = { type: 'inherited-from-broker-config' };
          break;
        }
        case pb.GetSubscribeRateResponse.SubscribeRateCase.SPECIFIED: {
          const subscribeRate = res.getSpecified()!;
          initialValue = {
            type: 'specified',
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
        if (value.type === 'inherited-from-broker-config') {
          const req = new pb.RemoveSubscribeRateRequest();
          req.setNamespace(`${props.tenant}/${props.namespace}`);

          const res = await namespaceServiceClient.removeSubscribeRate(req, {});
          if (res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set subscribe rate. ${res.getStatus()?.getMessage()}`);
          }
        }

        if (value.type === 'specified') {
          const req = new pb.SetSubscribeRateRequest();
          req.setNamespace(`${props.tenant}/${props.namespace}`);
          req.setSubscribeThrottlingRatePerConsumer(value.subscribeThrottlingRatePerConsumer);
          req.setRatePeriodInSeconds(value.ratePeriodInSeconds);

          const res = await namespaceServiceClient.setSubscribeRate(req, {});
          if (res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set subscribe rate. ${res.getStatus()?.getMessage()}`);
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
                  { type: 'item', value: 'specified', title: 'Specified' },
                ]}
                value={value.type}
                onChange={(type) => {
                  if (type === 'inherited-from-broker-config') {
                    onChange({ type });
                  }
                  if (type === 'specified') {
                    onChange({
                      type,
                      subscribeThrottlingRatePerConsumer: -1,
                      ratePeriodInSeconds: 30,
                    });
                  }
                }}
              />
            </div>
            {value.type === 'specified' && (
              <div>
                <div className={sf.FormItem}>
                  <div className={sf.FormLabel}>Rate period (sec.)</div>
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
  description: <span>Set subscribe-rate per consumer for all topics of the namespace.</span>,
  input: <FieldInput {...props} />
});

export default field;
