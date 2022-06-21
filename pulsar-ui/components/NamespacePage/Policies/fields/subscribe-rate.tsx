import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarAdminClient from '../../../app/contexts/PulsarAdminClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import sf from '../../../ui/ConfigurationTable/form.module.css';
import Input from "../../../ui/ConfigurationTable/Input/Input";
import { useEffect, useState } from 'react';
import UpdateConfirmation from '../../../ui/ConfigurationTable/UpdateConfirmation/UpdateConfirmation';
import SelectInput from "../../../ui/ConfigurationTable/SelectInput/SelectInput";
import { swrKeys } from '../../../swrKeys';
import { isEqual } from 'lodash';

const policy = 'subscribeRate';

export type SubscribeRate = 'disabled' | {
  subscribeRate: number;
  subscribeRatePeriod: number;
}

const defaultSubscribeRate: SubscribeRate = {
  subscribeRate: -1,
  subscribeRatePeriod: 30,
}

export type SubscribeRateInputProps = {
  value: SubscribeRate;
  onChange: (value: SubscribeRate) => void;
};
export const SubscribeRateInput: React.FC<SubscribeRateInputProps> = (props) => {
  const [subscribeRate, setSubscribeRate] = useState<SubscribeRate>(props.value);

  useEffect(() => {
    setSubscribeRate(() => props.value);
  }, [props.value]);

  const showUpdateConfirmation = !isEqual(props.value, subscribeRate);

  return (
    <div>
      <div className={sf.FormItem}>
        <SelectInput<'enabled' | 'disabled'>
          list={[{ value: 'disabled', title: 'Disabled' }, { value: 'enabled', title: 'Enabled' }]}
          value={subscribeRate === 'disabled' ? 'disabled' : 'enabled'}
          onChange={(value) => setSubscribeRate(value === 'disabled' ? 'disabled' : defaultSubscribeRate)}
        />
      </div>

      {subscribeRate !== 'disabled' && (
        <div>
          <div className={sf.FormItem}>
            <strong className={sf.FormLabel}>Subscribe rate</strong>
            <Input
              type='number'
              onChange={(v) => setSubscribeRate({ ...subscribeRate, subscribeRate: Number(v) })}
              value={String(subscribeRate.subscribeRate)}
            />
          </div>

          <div className={sf.FormItem}>
            <strong className={sf.FormLabel}>Subscribe rate period (sec.)</strong>
            <Input
              type='number'
              onChange={(v) => setSubscribeRate({ ...subscribeRate, subscribeRatePeriod: Number(v) })}
              value={String(subscribeRate.subscribeRatePeriod)}
            />
          </div>
        </div>
      )}

      {showUpdateConfirmation && (
        <UpdateConfirmation
          onUpdate={() => props.onChange(subscribeRate)}
          onReset={() => setSubscribeRate(props.value)}
        />
      )}
    </div>
  );
}

export declare type SubscribeRateData = {
  subscribeThrottlingRatePerConsumer?: number;
  ratePeriodInSecond?: number;
};

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const adminClient = PulsarAdminClient.useContext().client;
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();

  const onUpdateError = (err: string) => notifyError(`Can't update subscribe rate. ${err}`);
  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: subscribeRateData, error: subscribeRateError } = useSWR(
    swrKey,
    async () => await adminClient.namespaces.getSubscribeRate(props.tenant, props.namespace) as unknown as SubscribeRateData
  );

  if (subscribeRateError) {
    notifyError(`Unable to get subscribe rate. ${subscribeRateError}`);
  }

  const subscribeRate: SubscribeRate = subscribeRateData === undefined ? 'disabled' : {
    subscribeRate: subscribeRateData.subscribeThrottlingRatePerConsumer === undefined ? defaultSubscribeRate.subscribeRate : subscribeRateData.subscribeThrottlingRatePerConsumer,
    subscribeRatePeriod: subscribeRateData.ratePeriodInSecond === undefined ? defaultSubscribeRate.subscribeRatePeriod : subscribeRateData.ratePeriodInSecond,
  }

  return (
    <SubscribeRateInput
      value={subscribeRate}
      onChange={async (v) => {
        if (v === 'disabled') {
          await adminClient.namespaces.deleteSubscribeRate(props.tenant, props.namespace);
        } else {
          await adminClient.namespaces.setSubscribeRate(
            props.tenant,
            props.namespace,
            {
              subscribeThrottlingRatePerConsumer: v.subscribeRate,
              ratePeriodInSecond: v.subscribeRatePeriod,
            }).catch(onUpdateError);
        }

        await mutate(swrKey);
      }}
    />
  )
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Subscribe rate',
  description: <span>Set subscribe-rate per consumer for all topics of the namespace.</span>,
  input: <FieldInput {...props} />
});

export default field;
