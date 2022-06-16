import * as Notifications from '../../../contexts/Notifications';
import * as PulsarAdminClient from '../../../contexts/PulsarAdminClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ConfigurationTable/ConfigurationTable";
import sf from '../../../ConfigurationTable/form.module.css';
import Input from "../../../ConfigurationTable/Input/Input";
import { useEffect, useState } from 'react';
import UpdateConfirmation from '../../../ConfigurationTable/UpdateConfirmation/UpdateConfirmation';
import SelectInput from "../../../ConfigurationTable/SelectInput/SelectInput";
import { swrKeys } from '../../../swrKeys';

const policy = 'subscriptionDispatchRate';

export type SubscriptionDispatchRate = 'disabled' | {
  byteDispatchRate: number;
  dispatchRatePeriod: number;
  msgDispatchRate: number;
  relativeToPublishRate: boolean;
}

const defaultSubscriptionDispatchRate: SubscriptionDispatchRate = {
  byteDispatchRate: -1,
  dispatchRatePeriod: 1,
  msgDispatchRate: -1,
  relativeToPublishRate: false
}

export type SubscriptionDispatchRateInputProps = {
  value: SubscriptionDispatchRate;
  onChange: (value: SubscriptionDispatchRate) => void;
};
export const SubscriptionDispatchRateInput: React.FC<SubscriptionDispatchRateInputProps> = (props) => {
  const [dispatchRate, setDispatchRate] = useState<SubscriptionDispatchRate>(props.value);

  useEffect(() => {
    setDispatchRate(() => props.value);
  }, [props.value]);

  const showUpdateConfirmation = JSON.stringify(props.value) !== JSON.stringify(dispatchRate);

  return (
    <div>
      <div className={sf.FormItem}>
        <SelectInput<'enabled' | 'disabled'>
          list={[{ value: 'disabled', title: 'Disabled' }, { value: 'enabled', title: 'Enabled' }]}
          value={dispatchRate === 'disabled' ? 'disabled' : 'enabled'}
          onChange={(value) => setDispatchRate(value === 'disabled' ? 'disabled' : defaultSubscriptionDispatchRate)}
        />
      </div>

      {dispatchRate !== 'disabled' && (
        <div>
          <div className={sf.FormItem}>
            <strong className={sf.FormLabel}>Byte dispatch rate</strong>
            <Input
              type='number'
              onChange={(v) => setDispatchRate({ ...dispatchRate, byteDispatchRate: Number(v) })}
              value={String(dispatchRate.byteDispatchRate)}
            />
          </div>

          <div className={sf.FormItem}>
            <strong className={sf.FormLabel}>Dispatch rate period</strong>
            <Input
              type='number'
              onChange={(v) => setDispatchRate({ ...dispatchRate, dispatchRatePeriod: Number(v) })}
              value={String(dispatchRate.dispatchRatePeriod)}
            />
          </div>

          <div className={sf.FormItem}>
            <strong className={sf.FormLabel}>Message dispatch rate</strong>
            <Input
              type='number'
              onChange={(v) => setDispatchRate({ ...dispatchRate, msgDispatchRate: Number(v) })}
              value={String(dispatchRate.msgDispatchRate)}
            />
          </div>

          <div className={sf.FormItem}>
            <strong className={sf.FormLabel}>Relative to publish rate</strong>
            <SelectInput<boolean>
              list={[{ value: true, title: 'True' }, { value: false, title: 'False' }]}
              onChange={(v) => setDispatchRate({ ...dispatchRate, relativeToPublishRate: v })}
              value={dispatchRate.relativeToPublishRate}
            />
          </div>
        </div>
      )}

      {showUpdateConfirmation && (
        <UpdateConfirmation
          onUpdate={() => props.onChange(dispatchRate)}
          onReset={() => setDispatchRate(props.value)}
        />
      )}
    </div>
  );
}

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const adminClient = PulsarAdminClient.useContext().client;
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();

  const onUpdateError = (err: string) => notifyError(`Can't update subscription dispatch rate. ${err}`);
  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: dispatchRateData, error: dispatchRateError } = useSWR(
    swrKey,
    async () => await adminClient.namespaces.getSubscriptionDispatchRate(props.tenant, props.namespace)
  );

  if (dispatchRateError) {
    notifyError(`Unable to get subscription dispatch rate. ${dispatchRateError}`);
  }

  const dispatchRate: SubscriptionDispatchRate = dispatchRateData === undefined ? 'disabled' : {
    byteDispatchRate: dispatchRateData.dispatchThrottlingRateInByte === undefined ? defaultSubscriptionDispatchRate.byteDispatchRate : dispatchRateData.dispatchThrottlingRateInByte,
    dispatchRatePeriod: dispatchRateData.ratePeriodInSecond === undefined ? defaultSubscriptionDispatchRate.dispatchRatePeriod : dispatchRateData.ratePeriodInSecond,
    msgDispatchRate: dispatchRateData.dispatchThrottlingRateInMsg === undefined ? defaultSubscriptionDispatchRate.msgDispatchRate : dispatchRateData.dispatchThrottlingRateInMsg,
    relativeToPublishRate: dispatchRateData.relativeToPublishRate === undefined ? defaultSubscriptionDispatchRate.relativeToPublishRate : dispatchRateData.relativeToPublishRate,
  }

  return (
    <SubscriptionDispatchRateInput
      value={dispatchRate}
      onChange={async (value) => {
        if (value === 'disabled') {
          await adminClient.namespaces.deleteSubscriptionDispatchRate(props.tenant, props.namespace);
        } else {
          await adminClient.namespaces.setSubscriptionDispatchRate(
            props.tenant,
            props.namespace,
            {
              dispatchThrottlingRateInByte: value.byteDispatchRate,
              dispatchThrottlingRateInMsg: value.msgDispatchRate,
              ratePeriodInSecond: value.dispatchRatePeriod,
              relativeToPublishRate: value.relativeToPublishRate,
            }).catch(onUpdateError);
        }

        await mutate(swrKey);
      }}
    />
  )
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Subscription dispatch rate',
  description: <span>Set subscription message-dispatch-rate for all subscription of the namespace.</span>,
  input: <FieldInput {...props} />
});

export default field;
