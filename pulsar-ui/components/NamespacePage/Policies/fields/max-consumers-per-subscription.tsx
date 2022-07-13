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

const policy = 'maxConsumersPerSubscription';

type MaxConsumersPerSubscription = 'disabled' | {
  amount: number
};

const defaultMaxConsumersPerSubscription: MaxConsumersPerSubscription = {
  amount: 0
};

type MaxConsumersPerSubscriptionInputProps = {
  value: MaxConsumersPerSubscription;
  onChange: (value: MaxConsumersPerSubscription) => void;
}

const MaxConsumersPerSubscriptionInput: React.FC<MaxConsumersPerSubscriptionInputProps> = (props) => {
  const [maxConsumersPerSubscription, setMaxConsumersPerSubscription] = useState<MaxConsumersPerSubscription>(props.value);

  useEffect(() => {
    setMaxConsumersPerSubscription(() => props.value);
  }, [props.value]);

  const showUpdateConfirmation = !isEqual(props.value, maxConsumersPerSubscription);

  return (
    <div>
      <div className={sf.FormItem}>
        <SelectInput<'enabled' | 'disabled'>
          list={[{ type: 'item', value: 'disabled', title: 'Disabled' }, { type: 'item', value: 'enabled', title: 'Enabled' }]}
          value={maxConsumersPerSubscription === 'disabled' ? 'disabled' : 'enabled'}
          onChange={(v) => v === 'disabled' ? setMaxConsumersPerSubscription('disabled') : setMaxConsumersPerSubscription(defaultMaxConsumersPerSubscription)}
        />
      </div>
      {maxConsumersPerSubscription !== 'disabled' && (
        <Input
          type='number'
          value={String(maxConsumersPerSubscription.amount)}
          onChange={(v) => setMaxConsumersPerSubscription({ amount: Number(v) })}
        />
      )}
      {showUpdateConfirmation && (
        <UpdateConfirmation
          onUpdate={() => props.onChange(maxConsumersPerSubscription)}
          onReset={() => setMaxConsumersPerSubscription(props.value)}
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

  const onUpdateError = (err: string) => notifyError(`Can't update max consumers per subscription. ${err}`);
  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: maxConsumersPerSubscription, error: maxConsumersPerSubscriptionError } = useSWR(
    swrKey,
    async () => await adminClient.namespaces.getMaxConsumersPerSubscription(props.tenant, props.namespace)
  );

  if (maxConsumersPerSubscriptionError) {
    notifyError(`Unable to get max consumers per subscription. ${maxConsumersPerSubscriptionError}`);
  }

  return (
    <MaxConsumersPerSubscriptionInput
      value={maxConsumersPerSubscription === undefined ? 'disabled' : { amount: maxConsumersPerSubscription }}
      onChange={async (v) => {
        if (v === 'disabled') {
          await adminClient.namespaces.removeMaxConsumersPerSubscription(props.tenant, props.namespace).catch(onUpdateError);
        } else {
          await adminClient.namespaces.setMaxConsumersPerSubscription(
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
  title: 'Max consumers per subscription',
  description: <span>Max consumers per subscription.</span>,
  input: <FieldInput {...props} />
});

export default field;
