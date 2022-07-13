import SelectInput from "../../../ui/ConfigurationTable/SelectInput/SelectInputWithUpdateConfirmation";
import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarAdminClient from '../../../app/contexts/PulsarAdminClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import { swrKeys } from "../../../swrKeys";

const policy = 'schemaCompatibilityStrategy';

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

const strategies = [
  'FULL',
  'BACKWARD',
  'FORWARD',
  'UNDEFINED',
  'BACKWARD_TRANSITIVE',
  'FORWARD_TRANSITIVE',
  'FULL_TRANSITIVE',
  'ALWAYS_INCOMPATIBLE',
  'ALWAYS_COMPATIBLE'] as const;

type Strategy = typeof strategies[number];

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const adminClient = PulsarAdminClient.useContext().client;
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();

  const onUpdateError = (err: string) => notifyError(`Can't update schema compatibility strategy. ${err}`);
  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: strategy, error: strategyError } = useSWR(
    swrKey,
    async () => await adminClient.namespaces.getSchemaCompatibilityStrategy(props.tenant, props.namespace)
  );

  if (strategyError) {
    notifyError(`Unable to schema compatibility strategy: ${strategyError}`);
  }

  if (typeof strategy === 'undefined') {
    return <></>;
  }

  return (
    <SelectInput<Strategy>
      list={strategies.map(s => ({ type: 'item', value: s, title: s }))}
      value={strategy}
      onChange={async (v) => {
        await adminClient.namespaces.setSchemaCompatibilityStrategy(props.tenant, props.namespace, v).catch(onUpdateError);
        await mutate(swrKey);
      }}
    />
  );
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Schema compatibility strategy',
  description: <span>Compatibility level required for new schemas created via a Producer.</span>,
  input: <FieldInput {...props} />
});

export default field;
