import SelectInput from "../../../ConfigurationTable/SelectInput/SelectInputWithUpdateConfirmation";
import * as Notifications from '../../../contexts/Notifications';
import * as PulsarAdminClient from '../../../contexts/PulsarAdminClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ConfigurationTable/ConfigurationTable";

const policyId = 'subscriptionAuthMode';

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

type SubscriptionAuthMode = 'None' | 'Prefix';

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const adminClient = PulsarAdminClient.useContext().client;
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();

  const onUpdateError = (err: string) => notifyError(`Can't update subscription auth mode. ${err}`);
  const swrKey = ['pulsar', 'tenants', props.tenant, 'namespaces', props.namespace, 'policies', policyId];

  const { data: subscriptionAuthMode, error: subscriptionAuthModeError } = useSWR(
    swrKey,
    async () => await adminClient.namespaces.getSubscriptionAuthMode(props.tenant, props.namespace)
  );

  if (subscriptionAuthModeError) {
    notifyError(`Unable to get subscription auth mode: ${subscriptionAuthModeError}`);
  }

  if (typeof subscriptionAuthMode === 'undefined') {
    return <></>;
  }

  return (
    <SelectInput<SubscriptionAuthMode>
      list={[{ value: 'None', title: 'None' }, { value: 'Prefix', title: 'Prefix' }]}
      value={subscriptionAuthMode}
      onChange={async (v) => {
        await adminClient.namespaces.setSubscriptionAuthMode(props.tenant, props.namespace, v).catch(onUpdateError);
        await mutate(swrKey);
      }}
    />
  );
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policyId,
  title: 'Subscription auth mode',
  description: <span>Set subscription auth mode on a namespace.</span>,
  input: <FieldInput {...props} />
});

export default field;

