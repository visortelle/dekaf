import SelectInput from "../../../ConfigurationTable/SelectInput/SelectInputWithUpdateConfirmation";
import * as Notifications from '../../../contexts/Notifications';
import * as PulsarAdminClient from '../../../contexts/PulsarAdminClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ConfigurationTable/ConfigurationTable";

const policyId = 'encryptionRequired';

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

type EncryptionRequired = 'enabled' | 'disabled';

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const adminClient = PulsarAdminClient.useContext().client;
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();

  const onUpdateError = (err: string) => notifyError(`Can't update encryption required. ${err}`);
  const swrKey = ['pulsar', 'tenants', props.tenant, 'namespaces', props.namespace, 'policies', policyId];

  const { data: encryptionRequired, error: encryptionRequiredError } = useSWR(
    swrKey,
    async () => await adminClient.namespaces.getEncryptionRequired(props.tenant, props.namespace)
  );

  if (encryptionRequiredError) {
    notifyError(`Unable to get encryption required: ${encryptionRequiredError}`);
  }

  return (
    <SelectInput<EncryptionRequired>
      list={[{ value: 'enabled', title: 'Enabled' }, { value: 'disabled', title: 'Disabled' }]}
      value={encryptionRequired ? 'enabled' : 'disabled'}
      onChange={async (v) => {
        await adminClient.namespaces.modifyEncryptionRequired(props.tenant, props.namespace, v === 'enabled').catch(onUpdateError);
        await mutate(swrKey);
      }}
    />
  );
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policyId,
  title: 'Encryption required',
  description: <span>Enable or disable message encryption required for a namespace.</span>,
  input: <FieldInput {...props} />
});

export default field;

