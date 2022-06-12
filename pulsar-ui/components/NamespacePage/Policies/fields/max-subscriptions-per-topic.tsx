import * as Notifications from '../../../contexts/Notifications';
import * as PulsarAdminClient from '../../../contexts/PulsarAdminClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ConfigurationTable/ConfigurationTable";
import Input from '../../../ConfigurationTable/Input/InputWithUpdateConfirmation';

const policyId = 'maxSubscriptionsPerTopic';

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const adminClient = PulsarAdminClient.useContext().client;
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig()

  const onUpdateError = (err: string) => notifyError(`Can't update max subscriptions per topic. ${err}`);
  const swrKey = ['pulsar', 'tenants', props.tenant, 'namespaces', props.namespace, 'policies', policyId];

  const { data: maxSubscriptionsPerTopic, error: maxSubscriptionsPerTopicError } = useSWR(
    swrKey,
    async () => await adminClient.namespaces.getMaxSubscriptionsPerTopic(props.tenant, props.namespace)
  );

  if (maxSubscriptionsPerTopicError) {
    notifyError(`Unable to get maxSubscriptionsPerTopic. ${maxSubscriptionsPerTopicError}`);
  }

  return (
    <Input
      type='number'
      value={String(maxSubscriptionsPerTopic || 0)}
      onChange={async (value) => {
        const messageTtl = Number(value);

        if (messageTtl === 0) {
          await adminClient.namespaces.removeMaxSubscriptionsPerTopic(props.tenant, props.namespace).catch(onUpdateError);
        } else {
          await adminClient.namespaces.setMaxSubscriptionsPerTopic(
            props.tenant,
            props.namespace,
            messageTtl
          ).catch(onUpdateError);
        }

        await mutate(swrKey);
      }}
    />
  )
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policyId,
  title: 'Max subscriptions per topic',
  description: <span>Max subscriptions per topic.</span>,
  input: <FieldInput {...props} />
});

export default field;
