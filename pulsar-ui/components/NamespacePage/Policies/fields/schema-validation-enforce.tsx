import SelectInput from "../../../ui/ConfigurationTable/SelectInput/SelectInputWithUpdateConfirmation";
import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarAdminClient from '../../../app/contexts/PulsarAdminClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import { swrKeys } from "../../../swrKeys";

const policy = 'schemaValidationEnforce';

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

type SchemaValidationEnforce = 'enabled' | 'disabled';

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const adminClient = PulsarAdminClient.useContext().client;
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();

  const onUpdateError = (err: string) => notifyError(`Can't update is allow auto update schema. ${err}`);
  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: isAllowAutoUpdateSchema, error: isAllowAutoUpdateSchemaError } = useSWR(
    swrKey,
    async () => Boolean(await adminClient.namespaces.getSchemaValidtionEnforced(props.tenant, props.namespace))
  );

  if (isAllowAutoUpdateSchemaError) {
    notifyError(`Unable to get deduplication: ${isAllowAutoUpdateSchemaError}`);
  }

  return (
    <SelectInput<SchemaValidationEnforce>
      list={[{ type: 'item', value: 'disabled', title: 'Not enforced' }, { type: 'item', value: 'enabled', title: 'Enforced' }]}
      value={Boolean(isAllowAutoUpdateSchema) ? 'enabled' : 'disabled'}
      onChange={async (v) => {
        await adminClient.namespaces.setSchemaValidationEnforced(props.tenant, props.namespace, v === 'enabled').catch(onUpdateError);
        await mutate(swrKey);
      }}
    />
  );
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Schema validation enforce',
  description: <span>Set the schema whether open schema validation enforced.</span>,
  input: <FieldInput {...props} />
});

export default field;
