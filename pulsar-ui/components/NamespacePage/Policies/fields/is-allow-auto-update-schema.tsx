import SelectInput from "../../../ui/ConfigurationTable/SelectInput/SelectInputWithUpdateConfirmation";
import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarAdminClient from '../../../app/contexts/PulsarAdminClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import { swrKeys } from "../../../swrKeys";

const policy = 'is-allow-auto-update-schema';

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

type IsAllowAutoUpdateSchema = 'enabled' | 'disabled';

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const adminClient = PulsarAdminClient.useContext().client;
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();

  const onUpdateError = (err: string) => notifyError(`Can't update is allow auto update schema. ${err}`);
  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: isAllowAutoUpdateSchema, error: isAllowAutoUpdateSchemaError } = useSWR(
    swrKey,
    async () => Boolean(await adminClient.namespaces.getIsAllowAutoUpdateSchema(props.tenant, props.namespace))
  );

  if (isAllowAutoUpdateSchemaError) {
    notifyError(`Unable to get deduplication: ${isAllowAutoUpdateSchemaError}`);
  }

  return (
    <SelectInput<IsAllowAutoUpdateSchema>
      list={[{ type: 'item', value: 'disabled', title: 'Not allow' }, { type: 'item', value: 'enabled', title: 'Allow' }]}
      value={Boolean(isAllowAutoUpdateSchema) ? 'enabled' : 'disabled'}
      onChange={async (v) => {
        await adminClient.namespaces.setIsAllowAutoUpdateSchema(props.tenant, props.namespace, v === 'enabled').catch(onUpdateError);
        await mutate(swrKey);
      }}
    />
  );
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Allow auto update schema',
  description: <span>Set the namespace whether allow auto update schema.</span>,
  input: <FieldInput {...props} />
});

export default field;
