import SelectInput from "../../../ui/ConfigurationTable/SelectInput/SelectInputWithUpdateConfirmation";
import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarAdminClient from '../../../app/contexts/PulsarAdminClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import { swrKeys } from "../../../swrKeys";

const policy = 'deduplication';

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

type Deduplication = 'enabled' | 'disabled';

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const adminClient = PulsarAdminClient.useContext().client;
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();

  const onUpdateError = (err: string) => notifyError(`Can't update deduplication. ${err}`);
  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: deduplication, error: deduplicationError } = useSWR(
    swrKey,
    async () => Boolean(await adminClient.namespaces.getDeduplication(props.tenant, props.namespace)) // XXX - see https://github.com/apache/pulsar/issues/16024
  );

  if (deduplicationError) {
    notifyError(`Unable to get deduplication: ${deduplicationError}`);
  }

  return (
    <SelectInput<Deduplication>
      list={[{ value: 'disabled', title: 'Disabled' }, { value: 'enabled', title: 'Enabled' }]}
      value={deduplication ? 'enabled' : 'disabled'}
      onChange={async (v) => {
        if (v === 'enabled') {
          await adminClient.namespaces.modifyDeduplication(props.tenant, props.namespace, true).catch(onUpdateError);
        } else {
          await adminClient.namespaces.removeDeduplication(props.tenant, props.namespace).catch(onUpdateError);
        }

        await mutate(swrKey);
      }}
    />
  );
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Deduplication',
  description: <span>Enable or disable deduplication for a namespace.</span>,
  input: <FieldInput {...props} />
});

export default field;
