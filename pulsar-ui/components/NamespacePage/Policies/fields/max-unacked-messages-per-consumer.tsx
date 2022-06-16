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

const policy = 'maxUnackedMessagesPerConsumer';

type MaxUnackedMessagesPerConsumer = 'disabled' | {
  amount: number
};

const defaultMaxUnackedMessagesPerConsumer: MaxUnackedMessagesPerConsumer = {
  amount: 0
};

type MaxUnackedMessagesPerConsumerInputProps = {
  value: MaxUnackedMessagesPerConsumer;
  onChange: (value: MaxUnackedMessagesPerConsumer) => void;
}

const MaxUnackedMessagesPerConsumerInput: React.FC<MaxUnackedMessagesPerConsumerInputProps> = (props) => {
  const [maxUnackedMessagesPerConsumer, setMaxUnackedMessagesPerConsumer] = useState<MaxUnackedMessagesPerConsumer>(props.value);

  useEffect(() => {
    setMaxUnackedMessagesPerConsumer(() => props.value);
  }, [props.value]);

  const showUpdateConfirmation = JSON.stringify(props.value) !== JSON.stringify(maxUnackedMessagesPerConsumer);

  return (
    <div>
      <div className={sf.FormItem}>
        <SelectInput<'enabled' | 'disabled'>
          list={[{ value: 'disabled', title: 'Disabled' }, { value: 'enabled', title: 'Enabled' }]}
          value={maxUnackedMessagesPerConsumer === 'disabled' ? 'disabled' : 'enabled'}
          onChange={(v) => v === 'disabled' ? setMaxUnackedMessagesPerConsumer('disabled') : setMaxUnackedMessagesPerConsumer(defaultMaxUnackedMessagesPerConsumer)}
        />
      </div>
      {maxUnackedMessagesPerConsumer !== 'disabled' && (
        <Input
          type='number'
          value={String(maxUnackedMessagesPerConsumer.amount)}
          onChange={(v) => setMaxUnackedMessagesPerConsumer({ amount: Number(v) })}
        />
      )}
      {showUpdateConfirmation && (
        <UpdateConfirmation
          onUpdate={() => props.onChange(maxUnackedMessagesPerConsumer)}
          onReset={() => setMaxUnackedMessagesPerConsumer(props.value)}
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

  const onUpdateError = (err: string) => notifyError(`Can't update max unacked messages per consumer. ${err}`);
  const swrKey = swrKeys.pulsar.tenants.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: maxUnackedMessagesPerConsumer, error: maxUnackedMessagesPerConsumerError } = useSWR(
    swrKey,
    async () => await adminClient.namespaces.getMaxUnackedMessagesPerConsumer(props.tenant, props.namespace)
  );

  if (maxUnackedMessagesPerConsumerError) {
    notifyError(`Unable to get max unacked messages per consumer. ${maxUnackedMessagesPerConsumerError}`);
  }

  return (
    <MaxUnackedMessagesPerConsumerInput
      value={maxUnackedMessagesPerConsumer === undefined ? 'disabled' : { amount: maxUnackedMessagesPerConsumer }}
      onChange={async (v) => {
        if (v === 'disabled') {
          await adminClient.namespaces.removeMaxUnackedmessagesPerConsumer(props.tenant, props.namespace).catch(onUpdateError);
        } else {
          await adminClient.namespaces.setMaxUnackedMessagesPerConsumer(
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
  title: 'Max unacked messages per consumer',
  description: <span>Max unacked messages per consumer.</span>,
  input: <FieldInput {...props} />
});

export default field;
