import SelectInput from "../../../ConfigurationTable/SelectInput/SelectInputWithUpdateConfirmation";
import * as Notifications from '../../../contexts/Notifications';
import * as PulsarAdminClient from '../../../contexts/PulsarAdminClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ConfigurationTable/ConfigurationTable";

const policyId = 'deduplication';

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
  const swrKey = ['pulsar', 'tenants', props.tenant, 'namespaces', props.namespace, 'policies', policyId];

  const { data: deduplication, error: deduplicationError } = useSWR(
    swrKey,
    async () => Boolean(await adminClient.namespaces.getDeduplication(props.tenant, props.namespace)) // XXX - see https://github.com/apache/pulsar/issues/16024
  );

  if (deduplicationError) {
    notifyError(`Unable to get deduplication: ${deduplicationError}`);
  }

  return (
    <SelectInput<Deduplication>
      list={[{ value: 'enabled', title: 'Enabled' }, { value: 'disabled', title: 'Disabled' }]}
      value={deduplication ? 'enabled' : 'disabled'}
      onChange={async (v) => {
        if (v === 'enabled') {
          await adminClient.namespaces.modifyDeduplication(props.tenant, props.namespace, true);
        } else {
          await adminClient.namespaces.removeDeduplication(props.tenant, props.namespace);
        }

        await mutate(swrKey);
      }}
    />
  );
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policyId,
  title: 'Deduplication',
  description: <span>Enable or disable deduplication for a namespace.</span>,
  input: <FieldInput {...props} />
});

export default field;
