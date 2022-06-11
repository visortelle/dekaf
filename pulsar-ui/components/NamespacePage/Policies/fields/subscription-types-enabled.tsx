import SelectInput from "../../../ConfigurationTable/SelectInput/SelectInput";
import * as Notifications from '../../../contexts/Notifications';
import * as PulsarAdminClient from '../../../contexts/PulsarAdminClient';
import * as Either from 'fp-ts/lib/Either';
import useSWR, { useSWRConfig } from "swr";
import ListInput from "../../../ConfigurationTable/ListInput/ListInput";
import { ConfigurationField } from "../../../ConfigurationTable/ConfigurationTable";

const subscriptionTypes = ["Exclusive", "Shared", "Failover", "Key_Shared"] as const;
export type SubscriptionType = typeof subscriptionTypes[number];

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const adminClient = PulsarAdminClient.useContext().client;
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig()

  const onUpdateError = (err: string) => notifyError(`Can't update subscription types enabled. ${err}`);
  const swrKey = ['pulsar', 'tenants', props.tenant, 'namespaces', props.namespace, 'policies', 'subscriptionTypesEnabled'];

  const { data: subscriptionTypesEnabled, error: subscriptionTypesEnabledError } = useSWR(
    swrKey,
    async () => await adminClient.namespaces.getSubscriptionTypesEnabled(props.tenant, props.namespace)
  );

  if (subscriptionTypesEnabledError) {
    notifyError(`Unable to get subscription types enabled. ${subscriptionTypesEnabledError}`);
  }

  const hideAddButton = subscriptionTypesEnabled?.length === subscriptionTypes.length;

  return <ListInput<SubscriptionType>
    value={subscriptionTypesEnabled || []}
    getId={(v) => v}
    renderItem={(v) => <div>{v}</div>}
    editor={hideAddButton ? undefined : {
      render: (v, onChange) => {
        const list = subscriptionTypes.filter(t => !subscriptionTypesEnabled?.some(ste => ste === t)).map(c => ({ id: c, title: c }));
        return (
          <SelectInput
            list={[undefined, ...list]}
            value={v}
            onChange={(id) => onChange(id as SubscriptionType)}
            placeholder="Select subscription type"
          />
        )
      },
      initialValue: undefined,
    }}
    onRemove={(id) => {
      if (typeof subscriptionTypesEnabled === 'undefined') {
        return <></>
      }

      (async () => {
        await adminClient.namespaces.setSubscriptionTypesEnabled(props.tenant, props.namespace, subscriptionTypesEnabled.filter(r => r !== id)).catch(onUpdateError);
        await mutate(swrKey);
      })()
    }}
    onAdd={hideAddButton ? undefined : (v) => {
      (async () => {
        await adminClient.namespaces.setSubscriptionTypesEnabled(props.tenant, props.namespace, [...(subscriptionTypesEnabled || []), v]).catch(onUpdateError);
        await mutate(swrKey);
      })()
    }}
    isValid={(_) => Either.right(undefined)}
  />
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: 'subscriptionTypesEnabled',
  title: 'Subscription types enabled',
  description: 'Subscription types enabled for a namespace.',
  input: <FieldInput {...props} />
});

export default field;
