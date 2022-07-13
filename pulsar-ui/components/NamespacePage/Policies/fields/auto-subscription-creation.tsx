import SelectInput from "../../../ui/ConfigurationTable/SelectInput/SelectInputWithUpdateConfirmation";
import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarAdminClient from '../../../app/contexts/PulsarAdminClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import { swrKeys } from "../../../swrKeys";

const policy = 'autoSubscriptionCreation';

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

type AutoSubscriptionCreation = 'enabled' | 'disabled';

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const adminClient = PulsarAdminClient.useContext().client;
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();

  const onUpdateError = (err: string) => notifyError(`Can't update auto subscription creation. ${err}`);
  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: autoSubscriptionCreation, error: autoSubscriptionCreationError } = useSWR(
    swrKey,
    async () => Boolean(await adminClient.namespaces.getAutoSubscriptionCreation(props.tenant, props.namespace)) // XXX - see https://github.com/apache/pulsar/issues/16024
  );

  if (autoSubscriptionCreationError) {
    notifyError(`Unable to get deduplication: ${autoSubscriptionCreationError}`);
  }

  return (
    <SelectInput<AutoSubscriptionCreation>
      list={[{ type: 'item', value: 'disabled', title: 'Disabled' }, { type: 'item', value: 'enabled', title: 'Enabled' }]}
      value={autoSubscriptionCreation ? 'enabled' : 'disabled'}
      onChange={async (v) => {
        if (v === 'enabled') {
          await adminClient.namespaces.setAutoSubscriptionCreation(props.tenant, props.namespace, { allowAutoSubscriptionCreation: true }).catch(onUpdateError);
        } else {
          await adminClient.namespaces.removeAutoSubscriptionCreation(props.tenant, props.namespace).catch(onUpdateError);
        }

        await mutate(swrKey);
      }}
    />
  );
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Auto subscription creation',
  description: <span>Enable or disable auto subscription creation.</span>,
  input: <FieldInput {...props} />
});

export default field;
