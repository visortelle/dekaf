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

const policy = 'maxTopicsPerNamespace';

type MaxTopicsPerNamespace = 'disabled' | {
  amount: number
};

const defaultMaxSubscriptionPerTopic: MaxTopicsPerNamespace = {
  amount: 0
};

type MaxTopicsPerNamespaceInputProps = {
  value: MaxTopicsPerNamespace;
  onChange: (value: MaxTopicsPerNamespace) => void;
}

const MaxTopicsPerNamespaceInput: React.FC<MaxTopicsPerNamespaceInputProps> = (props) => {
  const [maxTopicsPerNamespace, setMaxTopicsPerNamespace] = useState<MaxTopicsPerNamespace>(props.value);

  useEffect(() => {
    setMaxTopicsPerNamespace(() => props.value);
  }, [props.value]);

  const showUpdateConfirmation = !isEqual(props.value, maxTopicsPerNamespace);

  return (
    <div>
      <div className={sf.FormItem}>
        <SelectInput<'enabled' | 'disabled'>
          list={[{ value: 'disabled', title: 'Disabled' }, { value: 'enabled', title: 'Enabled' }]}
          value={maxTopicsPerNamespace === 'disabled' ? 'disabled' : 'enabled'}
          onChange={(v) => v === 'disabled' ? setMaxTopicsPerNamespace('disabled') : setMaxTopicsPerNamespace(defaultMaxSubscriptionPerTopic)}
        />
      </div>
      {maxTopicsPerNamespace !== 'disabled' && (
        <Input
          type='number'
          value={String(maxTopicsPerNamespace.amount)}
          onChange={(v) => setMaxTopicsPerNamespace({ amount: Number(v) })}
        />
      )}
      {showUpdateConfirmation && (
        <UpdateConfirmation
          onUpdate={() => props.onChange(maxTopicsPerNamespace)}
          onReset={() => setMaxTopicsPerNamespace(props.value)}
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

  const onUpdateError = (err: string) => notifyError(`Can't update max topics per namespace. ${err}`);
  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: maxTopicsPerNamespace, error: maxTopicsPerNamespaceError } = useSWR(
    swrKey,
    async () => await adminClient.namespaces.getMaxTopicsPerNamespace(props.tenant, props.namespace)
  );

  if (maxTopicsPerNamespaceError) {
    notifyError(`Unable to get max topics per namespace. ${maxTopicsPerNamespaceError}`);
  }

  return (
    <MaxTopicsPerNamespaceInput
      value={maxTopicsPerNamespace === undefined ? 'disabled' : { amount: maxTopicsPerNamespace }}
      onChange={async (v) => {
        if (v === 'disabled') {
          // await adminClient.namespaces.setInactiveTopicPolicies2(props.tenant, props.namespace).catch(onUpdateError);
        } else {
          // XXX - why is it setInactiveTopicPolicies1 (!?)
          // await adminClient.namespaces.setInactiveTopicPolicies1(
          //   props.tenant,
          //   props.namespace,
          //   v.amount
          // ).catch(onUpdateError);
        }

        await mutate(swrKey);
      }}
    />
  )
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Max topics per namespace.',
  description: <span>Max topics per namespace.</span>,
  input: <FieldInput {...props} />
});

export default field;
