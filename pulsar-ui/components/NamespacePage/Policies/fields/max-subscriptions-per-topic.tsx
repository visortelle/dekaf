import * as Notifications from '../../../contexts/Notifications';
import * as PulsarAdminClient from '../../../contexts/PulsarAdminClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ConfigurationTable/ConfigurationTable";
import Input from '../../../ConfigurationTable/Input/Input';
import SelectInput from '../../../ConfigurationTable/SelectInput/SelectInput';
import sf from '../../../ConfigurationTable/form.module.css';
import { useEffect, useState } from 'react';
import UpdateConfirmation from '../../../ConfigurationTable/UpdateConfirmation/UpdateConfirmation';
import { swrKeys } from '../../../swrKeys';

const policy = 'maxSubscriptionsPerTopic';

type MaxSubscriptionsPerTopic = 'disabled' | {
  amount: number
};

const defaultMaxSubscriptionPerTopic: MaxSubscriptionsPerTopic = {
  amount: 0
};

type MaxSubscriptionsPerTopicInputProps = {
  value: MaxSubscriptionsPerTopic;
  onChange: (value: MaxSubscriptionsPerTopic) => void;
}

const MaxSubscriptionsPerTopicInput: React.FC<MaxSubscriptionsPerTopicInputProps> = (props) => {
  const [maxSubscriptionsPerTopic, setMaxSubscriptionsPerTopic] = useState<MaxSubscriptionsPerTopic>(props.value);

  useEffect(() => {
    setMaxSubscriptionsPerTopic(() => props.value);
  }, [props.value]);

  const showUpdateConfirmation = JSON.stringify(props.value) !== JSON.stringify(maxSubscriptionsPerTopic);

  return (
    <div>
      <div className={sf.FormItem}>
        <SelectInput<'enabled' | 'disabled'>
          list={[{ value: 'disabled', title: 'Disabled' }, { value: 'enabled', title: 'Enabled' }]}
          value={maxSubscriptionsPerTopic === 'disabled' ? 'disabled' : 'enabled'}
          onChange={(v) => v === 'disabled' ? setMaxSubscriptionsPerTopic('disabled') : setMaxSubscriptionsPerTopic(defaultMaxSubscriptionPerTopic)}
        />
      </div>
      {maxSubscriptionsPerTopic !== 'disabled' && (
        <Input
          type='number'
          value={String(maxSubscriptionsPerTopic.amount)}
          onChange={(v) => setMaxSubscriptionsPerTopic({ amount: Number(v) })}
        />
      )}
      {showUpdateConfirmation && (
        <UpdateConfirmation
          onUpdate={() => props.onChange(maxSubscriptionsPerTopic)}
          onReset={() => setMaxSubscriptionsPerTopic(props.value)}
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

  const onUpdateError = (err: string) => notifyError(`Can't update max subscriptions per topic. ${err}`);
  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: maxSubscriptionsPerTopic, error: maxSubscriptionsPerTopicError } = useSWR(
    swrKey,
    async () => await adminClient.namespaces.getMaxSubscriptionsPerTopic(props.tenant, props.namespace)
  );

  if (maxSubscriptionsPerTopicError) {
    notifyError(`Unable to get max subscriptions per topic. ${maxSubscriptionsPerTopicError}`);
  }

  return (
    <MaxSubscriptionsPerTopicInput
      value={maxSubscriptionsPerTopic === undefined ? 'disabled' : { amount: maxSubscriptionsPerTopic }}
      onChange={async (v) => {
        if (v === 'disabled') {
          await adminClient.namespaces.removeMaxSubscriptionsPerTopic(props.tenant, props.namespace).catch(onUpdateError);
        } else {
          await adminClient.namespaces.setMaxSubscriptionsPerTopic(
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
  title: 'Max subscriptions per topic',
  description: <span>Max subscriptions per topic.</span>,
  input: <FieldInput {...props} />
});

export default field;
