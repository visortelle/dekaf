import * as Notifications from '../../../contexts/Notifications';
import * as PulsarAdminClient from '../../../contexts/PulsarAdminClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ConfigurationTable/ConfigurationTable";
import Input from '../../../ConfigurationTable/Input/InputWithUpdateConfirmation';
import { swrKeys } from '../../../swrKeys';

const policy = 'antiAffinityGroup';

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const adminClient = PulsarAdminClient.useContext().client;
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig()

  const onUpdateError = (err: string) => notifyError(`Can't update anti-affinity group. ${err}`);
  const swrKey = swrKeys.pulsar.tenants.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy  });

  const { data: antiAffinityGroup, error: antiAffinityGroupError } = useSWR(
    swrKey,
    async () => await adminClient.namespaces.getNamespaceAntiAffinityGroup(props.tenant, props.namespace)
  );

  if (antiAffinityGroupError) {
    notifyError(`Unable to get message TTL. ${antiAffinityGroupError}`);
  }

  return (
    <Input
      value={antiAffinityGroup || ''}
      onChange={async (antiAffinityGroup) => {
        if (antiAffinityGroup === '') {
          await adminClient.namespaces.removeNamespaceAntiAffinityGroup(props.tenant, props.namespace).catch(onUpdateError);
          await mutate(swrKey);
          return;
        }

        await adminClient.namespaces.setNamespaceAntiAffinityGroup(
          props.tenant,
          props.namespace,
          antiAffinityGroup
        ).catch(onUpdateError);

        await mutate(swrKey);
      }}
      placeholder="Enter group name"
    />
  )
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Anti-affinity group',
  description: <span>Anti-affinity group name for a namespace.</span>,
  input: <FieldInput {...props} />
});

export default field;
