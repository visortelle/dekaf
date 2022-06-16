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

const policy = 'maxProducersPerTopic';

type MaxProducersPerTopic = 'disabled' | {
  amount: number
};

const defaultMaxProducersPerTopic: MaxProducersPerTopic = {
  amount: 0
};

type MaxProducersPerTopicInputProps = {
  value: MaxProducersPerTopic;
  onChange: (value: MaxProducersPerTopic) => void;
}

const MaxProducersPerTopicInput: React.FC<MaxProducersPerTopicInputProps> = (props) => {
  const [maxProducersPerTopic, setMaxProducersPerTopic] = useState<MaxProducersPerTopic>(props.value);

  useEffect(() => {
    setMaxProducersPerTopic(() => props.value);
  }, [props.value]);

  const showUpdateConfirmation = JSON.stringify(props.value) !== JSON.stringify(maxProducersPerTopic);

  return (
    <div>
      <div className={sf.FormItem}>
        <SelectInput<'enabled' | 'disabled'>
          list={[{ value: 'disabled', title: 'Disabled' }, { value: 'enabled', title: 'Enabled' }]}
          value={maxProducersPerTopic === 'disabled' ? 'disabled' : 'enabled'}
          onChange={(v) => v === 'disabled' ? setMaxProducersPerTopic('disabled') : setMaxProducersPerTopic(defaultMaxProducersPerTopic)}
        />
      </div>
      {maxProducersPerTopic !== 'disabled' && (
        <Input
          type='number'
          value={String(maxProducersPerTopic.amount)}
          onChange={(v) => setMaxProducersPerTopic({ amount: Number(v) })}
        />
      )}
      {showUpdateConfirmation && (
        <UpdateConfirmation
          onUpdate={() => props.onChange(maxProducersPerTopic)}
          onReset={() => setMaxProducersPerTopic(props.value)}
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

  const onUpdateError = (err: string) => notifyError(`Can't update max producers per topic. ${err}`);
  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: maxProducersPerTopic, error: maxProducersPerTopicError } = useSWR(
    swrKey,
    async () => await adminClient.namespaces.getMaxProducersPerTopic(props.tenant, props.namespace)
  );

  if (maxProducersPerTopicError) {
    notifyError(`Unable to get max producers per topic. ${maxProducersPerTopicError}`);
  }

  return (
    <MaxProducersPerTopicInput
      value={maxProducersPerTopic === undefined ? 'disabled' : { amount: maxProducersPerTopic }}
      onChange={async (v) => {
        if (v === 'disabled') {
          await adminClient.namespaces.removeMaxProducersPerTopic(props.tenant, props.namespace).catch(onUpdateError);
        } else {
          await adminClient.namespaces.setMaxProducersPerTopic(
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
  title: 'Max producers per topic',
  description: <span>Max producers per topic.</span>,
  input: <FieldInput {...props} />
});

export default field;
