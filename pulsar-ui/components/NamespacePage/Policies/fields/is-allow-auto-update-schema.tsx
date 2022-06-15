import SelectInput from "../../../ConfigurationTable/SelectInput/SelectInputWithUpdateConfirmation";
import * as Notifications from '../../../contexts/Notifications';
import * as PulsarAdminClient from '../../../contexts/PulsarAdminClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ConfigurationTable/ConfigurationTable";

const policyId = 'is-allow-auto-update-schema';

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

type IsAllowAutoUpdateSchema = 'enable' | 'disable';

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const adminClient = PulsarAdminClient.useContext().client;
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();

  const onUpdateError = (err: string) => notifyError(`Can't update is allow auto update schema. ${err}`);
  const swrKey = ['pulsar', 'tenants', props.tenant, 'namespaces', props.namespace, 'policies', policyId];

  const { data: isAllowAutoUpdateSchema, error: isAllowAutoUpdateSchemaError } = useSWR(
    swrKey,
    async () => Boolean(await adminClient.namespaces.getIsAllowAutoUpdateSchema(props.tenant, props.namespace))
  );

  if (isAllowAutoUpdateSchemaError) {
    notifyError(`Unable to get deduplication: ${isAllowAutoUpdateSchemaError}`);
  }

  return (
    <SelectInput<IsAllowAutoUpdateSchema>
      list={[{ value: 'disable', title: 'Disable' }, { value: 'enable', title: 'Enable' }]}
      value={Boolean(isAllowAutoUpdateSchema) ? 'enable' : 'disable'}
      onChange={async (v) => {
        if (v === 'enable') {
          await adminClient.namespaces.setIsAllowAutoUpdateSchema(props.tenant, props.namespace, true).catch(onUpdateError);
        } else {
          await adminClient.namespaces.setIsAllowAutoUpdateSchema(props.tenant, props.namespace, false).catch(onUpdateError);
        }

        await mutate(swrKey);
      }}
    />
  );
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policyId,
  title: 'Allow auto update schema',
  description: <span> Set the namespace whether allow auto update schema.</span>,
  input: <FieldInput {...props} />
});

export default field;
