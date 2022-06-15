import * as Notifications from '../../../contexts/Notifications';
import * as PulsarAdminClient from '../../../contexts/PulsarAdminClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ConfigurationTable/ConfigurationTable";
import Input from '../../../ConfigurationTable/Input/Input';
import SelectInput from '../../../ConfigurationTable/SelectInput/SelectInput';
import sf from '../../../ConfigurationTable/form.module.css';
import { useEffect, useState } from 'react';
import UpdateConfirmation from '../../../ConfigurationTable/UpdateConfirmation/UpdateConfirmation';

const policyId = 'maxConsumersPerTopic';

type MaxConsumersPerTopic = 'disabled' | {
  amount: number
};

const defaultMaxConsumersPerTopic: MaxConsumersPerTopic = {
  amount: 0
};

type MaxConsumersPerTopicInputProps = {
  value: MaxConsumersPerTopic;
  onChange: (value: MaxConsumersPerTopic) => void;
}

const MaxConsumersPerTopicInput: React.FC<MaxConsumersPerTopicInputProps> = (props) => {
  const [maxConsumersPerTopic, setMaxConsumersPerTopic] = useState<MaxConsumersPerTopic>(props.value);

  useEffect(() => {
    setMaxConsumersPerTopic(() => props.value);
  }, [props.value]);

  const showUpdateConfirmation = JSON.stringify(props.value) !== JSON.stringify(maxConsumersPerTopic);

  return (
    <div>
      <div className={sf.FormItem}>
        <SelectInput<'enabled' | 'disabled'>
          list={[{ value: 'disabled', title: 'Disabled' }, { value: 'enabled', title: 'Enabled' }]}
          value={maxConsumersPerTopic === 'disabled' ? 'disabled' : 'enabled'}
          onChange={(v) => v === 'disabled' ? setMaxConsumersPerTopic('disabled') : setMaxConsumersPerTopic(defaultMaxConsumersPerTopic)}
        />
      </div>
      {maxConsumersPerTopic !== 'disabled' && (
        <Input
          type='number'
          value={String(maxConsumersPerTopic.amount)}
          onChange={(v) => setMaxConsumersPerTopic({ amount: Number(v) })}
        />
      )}
      {showUpdateConfirmation && (
        <UpdateConfirmation
          onUpdate={() => props.onChange(maxConsumersPerTopic)}
          onReset={() => setMaxConsumersPerTopic(props.value)}
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

  const onUpdateError = (err: string) => notifyError(`Can't update max consumers per topic. ${err}`);
  const swrKey = ['pulsar', 'tenants', props.tenant, 'namespaces', props.namespace, 'policies', policyId];

  const { data: maxConsumersPerTopic, error: maxConsumersPerTopicError } = useSWR(
    swrKey,
    async () => await adminClient.namespaces.getMaxConsumersPerTopic(props.tenant, props.namespace)
  );

  if (maxConsumersPerTopicError) {
    notifyError(`Unable to get max consumers per topic. ${maxConsumersPerTopicError}`);
  }

  return (
    <MaxConsumersPerTopicInput
      value={maxConsumersPerTopic === undefined ? 'disabled' : { amount: maxConsumersPerTopic }}
      onChange={async (v) => {
        if (v === 'disabled') {
          await adminClient.namespaces.removeMaxConsumersPerTopic(props.tenant, props.namespace).catch(onUpdateError);
        } else {
          await adminClient.namespaces.setMaxConsumersPerTopic(
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
  id: policyId,
  title: 'Max consumers per topic',
  description: <span>Max consumers per topic.</span>,
  input: <FieldInput {...props} />
});

export default field;
