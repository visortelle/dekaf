import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarAdminClient from '../../../app/contexts/PulsarAdminClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import Input from '../../../ui/ConfigurationTable/Input/Input';
import SelectInput from '../../../ui/ConfigurationTable/SelectInput/SelectInput';
import sf from '../../../ui/ConfigurationTable/form.module.css';
import { useEffect, useState } from 'react';
import UpdateConfirmation from '../../../ui/ConfigurationTable/UpdateConfirmation/UpdateConfirmation';
import { swrKeys } from '../../../swrKeys';
import { isEqual } from 'lodash';

const policy = 'maxUnackedMessagesPerSubscription';

type MaxUnackedMessagesPerSubscription = 'disabled' | {
  amount: number
};

const defaultMaxUnackedMessagesPerSubscription: MaxUnackedMessagesPerSubscription = {
  amount: 0
};

type MaxUnackedMessagesPerSubscriptionInputProps = {
  value: MaxUnackedMessagesPerSubscription;
  onChange: (value: MaxUnackedMessagesPerSubscription) => void;
}

const MaxUnackedMessagesPerSubscriptionInput: React.FC<MaxUnackedMessagesPerSubscriptionInputProps> = (props) => {
  const [maxUnackedMessagesPerSubscription, setMaxUnackedMessagesPerSubscription] = useState<MaxUnackedMessagesPerSubscription>(props.value);

  useEffect(() => {
    setMaxUnackedMessagesPerSubscription(() => props.value);
  }, [props.value]);

  const showUpdateConfirmation = !isEqual(props.value, maxUnackedMessagesPerSubscription);

  return (
    <div>
      <div className={sf.FormItem}>
        <SelectInput<'enabled' | 'disabled'>
          list={[{ value: 'disabled', title: 'Disabled' }, { value: 'enabled', title: 'Enabled' }]}
          value={maxUnackedMessagesPerSubscription === 'disabled' ? 'disabled' : 'enabled'}
          onChange={(v) => v === 'disabled' ? setMaxUnackedMessagesPerSubscription('disabled') : setMaxUnackedMessagesPerSubscription(defaultMaxUnackedMessagesPerSubscription)}
        />
      </div>
      {maxUnackedMessagesPerSubscription !== 'disabled' && (
        <Input
          type='number'
          value={String(maxUnackedMessagesPerSubscription.amount)}
          onChange={(v) => setMaxUnackedMessagesPerSubscription({ amount: Number(v) })}
        />
      )}
      {showUpdateConfirmation && (
        <UpdateConfirmation
          onUpdate={() => props.onChange(maxUnackedMessagesPerSubscription)}
          onReset={() => setMaxUnackedMessagesPerSubscription(props.value)}
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

  const onUpdateError = (err: string) => notifyError(`Can't update max unacked messages per subscription. ${err}`);
  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: maxUnackedMessagesPerSubscription, error: maxUnackedMessagesPerSubscriptionError } = useSWR(
    swrKey,
    async () => await adminClient.namespaces.getMaxUnackedmessagesPerSubscription(props.tenant, props.namespace)
  );

  if (maxUnackedMessagesPerSubscriptionError) {
    notifyError(`Unable to get max unacked messages per subscription. ${maxUnackedMessagesPerSubscriptionError}`);
  }

  return (
    <MaxUnackedMessagesPerSubscriptionInput
      value={maxUnackedMessagesPerSubscription === undefined ? 'disabled' : { amount: maxUnackedMessagesPerSubscription }}
      onChange={async (v) => {
        if (v === 'disabled') {
          await adminClient.namespaces.removeMaxUnackedmessagesPerSubscription(props.tenant, props.namespace).catch(onUpdateError);
        } else {
          await adminClient.namespaces.setMaxUnackedMessagesPerSubscription(
            props.tenant,
            props.namespace,
            v.amount
          ).catch(onUpdateError);
        }

        await mutate(swrKey);
      }}
    />
  )
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Max unacked messages per subscription',
  description: <span>Max unacked messages per subscription.</span>,
  input: <FieldInput {...props} />
});

export default field;
