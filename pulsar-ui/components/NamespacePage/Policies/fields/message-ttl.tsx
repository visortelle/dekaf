import * as Notifications from '../../../contexts/Notifications';
import * as PulsarAdminClient from '../../../contexts/PulsarAdminClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ConfigurationTable/ConfigurationTable";
import Input from '../../../ConfigurationTable/Input/InputWithUpdateConfirmation';
import sf from '../../../ConfigurationTable/form.module.css';

const policyId = 'messageTtl';

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const adminClient = PulsarAdminClient.useContext().client;
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig()

  const onUpdateError = (err: string) => notifyError(`Can't update message TTL. ${err}`);
  const swrKey = ['pulsar', 'tenants', props.tenant, 'namespaces', props.namespace, 'policies', policyId];

  const { data: messageTtl, error: messageTtlError } = useSWR(
    swrKey,
    async () => await adminClient.namespaces.getNamespaceMessageTtl(props.tenant, props.namespace)
  );

  if (messageTtlError) {
    notifyError(`Unable to get message TTL. ${messageTtlError}`);
  }

  return (
    <div>
      <strong className={sf.FormLabel}>Message TTL (sec.)</strong>
      <Input
        type='number'
        value={String(messageTtl || 0)}
        onChange={async (value) => {
          const messageTtl = Number(value);

          if (messageTtl === 0) {
            await adminClient.namespaces.removeNamespaceMessageTtl(props.tenant, props.namespace).catch(onUpdateError);
          } else {
            await adminClient.namespaces.setNamespaceMessageTtl(
              props.tenant,
              props.namespace,
              messageTtl
            ).catch(onUpdateError);
          }

          await mutate(swrKey);
        }}
      />
    </div>

  )
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policyId,
  title: 'Message TTL',
  description: <span>By default, Pulsar stores all unacknowledged messages forever. This can lead to heavy disk space usage in cases where a lot of messages are going unacknowledged. <br />If disk space is a concern, you can set a time to live (TTL) that determines how long unacknowledged messages will be retained.</span>,
  input: <FieldInput {...props} />
});

export default field;
