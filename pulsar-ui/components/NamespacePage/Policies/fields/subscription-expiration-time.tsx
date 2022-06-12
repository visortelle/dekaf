import * as Notifications from '../../../contexts/Notifications';
import * as PulsarAdminClient from '../../../contexts/PulsarAdminClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ConfigurationTable/ConfigurationTable";
import Input from '../../../ConfigurationTable/Input/InputWithUpdateConfirmation';

const policyId = 'subscriptionExpirationTime';

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const adminClient = PulsarAdminClient.useContext().client;
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig()

  const onUpdateError = (err: string) => notifyError(`Can't update message TTL. ${err}`);
  const swrKey = ['pulsar', 'tenants', props.tenant, 'namespaces', props.namespace, 'policies', policyId];

  const { data: subscriptionExpirationTime, error: subscriptionExpirationTimeError } = useSWR(
    swrKey,
    async () => await adminClient.namespaces.getSubscriptionExpirationTime(props.tenant, props.namespace)
  );

  if (subscriptionExpirationTimeError) {
    notifyError(`Unable to get subscription expiration time. ${subscriptionExpirationTimeError}`);
  }

  return (
    <Input
      type='number'
      value={String(subscriptionExpirationTime || 0)}
      onChange={async (value) => {
        const subscriptionExpirationTime = Number(value);

        if (subscriptionExpirationTime === 0) {
          await adminClient.namespaces.removeSubscriptionExpirationTime(props.tenant, props.namespace).catch(onUpdateError);
          await mutate(swrKey);
          return;
        }

        await adminClient.namespaces.setSubscriptionExpirationTime(
          props.tenant,
          props.namespace,
          subscriptionExpirationTime
        ).catch(onUpdateError);

        await mutate(swrKey);
      }}
    />
  )
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policyId,
  title: 'Subscription expiration time',
  description: <span>Subscription expiration time in minutes.</span>,
  input: <FieldInput {...props} />
});

export default field;

