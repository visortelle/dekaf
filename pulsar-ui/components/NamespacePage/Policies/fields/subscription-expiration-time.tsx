import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarAdminClient from '../../../app/contexts/PulsarAdminClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import { Duration } from '../../../ui/ConfigurationTable/DurationInput/types';
import { useEffect, useState } from 'react';
import sf from '../../../ui/ConfigurationTable/form.module.css';
import SelectInput from '../../../ui/ConfigurationTable/SelectInput/SelectInput';
import { durationToSeconds, secondsToDuration } from '../../../ui/ConfigurationTable/DurationInput/conversions';
import DurationInput from '../../../ui/ConfigurationTable/DurationInput/DurationInput';
import UpdateConfirmation from '../../../ui/ConfigurationTable/UpdateConfirmation/UpdateConfirmation';
import { swrKeys } from '../../../swrKeys';
import { isEqual } from 'lodash';

const policy = 'subscriptionExpirationTime';

type SubscriptionExpirationTime = 'disabled' | {
  duration: Duration;
};

const defaultSubscriptionExpirationTime: SubscriptionExpirationTime = {
  duration: {
    unit: 'm',
    value: 1,
  }
};

type SubscriptionExpirationTimeInputProps = {
  value: SubscriptionExpirationTime;
  onChange: (value: SubscriptionExpirationTime) => void;
}

const SubscriptionExpirationTimeInput: React.FC<SubscriptionExpirationTimeInputProps> = (props) => {
  const [subscriptionExpirationTime, setSubscriptionExpirationTime] = useState<SubscriptionExpirationTime>(props.value);

  useEffect(() => {
    setSubscriptionExpirationTime(() => props.value);
  }, [props.value]);

  const showUpdateConfirmation = !isEqual(props.value, subscriptionExpirationTime);

  return (
    <div>
      <div className={sf.FormItem}>
        <SelectInput<'enabled' | 'disabled'>
          list={[{ type: 'item', value: 'disabled', title: 'Disabled' }, { type: 'item', value: 'enabled', title: 'Enabled' }]}
          value={subscriptionExpirationTime === 'disabled' ? 'disabled' : 'enabled'}
          onChange={(v) => v === 'disabled' ? setSubscriptionExpirationTime('disabled') : setSubscriptionExpirationTime(defaultSubscriptionExpirationTime)}
        />
      </div>
      {subscriptionExpirationTime !== 'disabled' && (
        <DurationInput
          value={subscriptionExpirationTime.duration}
          onChange={(v) => {
            // Minutes are use as units for the subscription expiration time.
            if (v.unit === 's') {
              setSubscriptionExpirationTime({ duration: { value: v.value, unit: 'm' } });
              return;
            }

            setSubscriptionExpirationTime({ duration: v });
          }}
        />
      )}
      {showUpdateConfirmation && (
        <UpdateConfirmation
          onUpdate={() => props.onChange(subscriptionExpirationTime)}
          onReset={() => setSubscriptionExpirationTime(props.value)}
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
  const { mutate } = useSWRConfig()

  const onUpdateError = (err: string) => notifyError(`Can't update message TTL. ${err}`);
  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: subscriptionExpirationTimeInMinutes, error: subscriptionExpirationTimeError } = useSWR(
    swrKey,
    async () => await adminClient.namespaces.getSubscriptionExpirationTime(props.tenant, props.namespace)
  );

  if (subscriptionExpirationTimeError) {
    notifyError(`Unable to get subscription expiration time. ${subscriptionExpirationTimeError}`);
  }

  return (
    <SubscriptionExpirationTimeInput
      value={subscriptionExpirationTimeInMinutes === undefined ? 'disabled' : {
        duration: secondsToDuration(subscriptionExpirationTimeInMinutes * 60)
      }}
      onChange={async (v) => {
        if (v === 'disabled') {
          await adminClient.namespaces.removeSubscriptionExpirationTime(props.tenant, props.namespace).catch(onUpdateError);
        } else {
          await adminClient.namespaces.setSubscriptionExpirationTime(
            props.tenant,
            props.namespace,
            durationToSeconds(v.duration) / 60
          ).catch(onUpdateError);
        }

        await mutate(swrKey);
      }}
    />
  )
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Subscription expiration time',
  description: <span>Subscription expiration time.</span>,
  input: <FieldInput {...props} />
});

export default field;
