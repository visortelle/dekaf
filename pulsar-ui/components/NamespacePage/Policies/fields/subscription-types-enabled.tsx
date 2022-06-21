import SelectInput from "../../../ui/ConfigurationTable/SelectInput/SelectInput";
import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarAdminClient from '../../../app/contexts/PulsarAdminClient';
import * as Either from 'fp-ts/lib/Either';
import useSWR, { useSWRConfig } from "swr";
import ListInput from "../../../ui/ConfigurationTable/ListInput/ListInput";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import sf from '../../../ui/ConfigurationTable/form.module.css';
import { useEffect, useState } from "react";
import UpdateConfirmation from "../../../ui/ConfigurationTable/UpdateConfirmation/UpdateConfirmation";
import { swrKeys } from "../../../swrKeys";
import { isEqual } from "lodash";

const policy = 'subscriptionTypesEnabled';

const subscriptionTypes = ["Exclusive", "Shared", "Failover", "Key_Shared"] as const;
export type SubscriptionType = typeof subscriptionTypes[number];

type SubscriptionTypesEnabled = 'all' | { customList: SubscriptionType[] };

type SubscriptionTypesEnabledProps = {
  value: SubscriptionTypesEnabled;
  onChange: (value: SubscriptionTypesEnabled) => void;
}

const SubscriptionTypesEnabledInput: React.FC<SubscriptionTypesEnabledProps> = (props) => {
  const [subscriptionTypesEnabled, setSubscriptionTypesEnabled] = useState<SubscriptionTypesEnabled>(props.value);

  useEffect(() => {
    setSubscriptionTypesEnabled(() => props.value);
  }, [props.value]);

  const showUpdateConfirmation = !isEqual(props.value, subscriptionTypesEnabled);

  return (
    <div>
      <div className={sf.FormItem}>
        <SelectInput<'all' | 'customList'>
          list={[{ value: 'all', title: 'All' }, { value: 'customList', title: 'Custom list' }]}
          onChange={(v) => v === 'all' ? setSubscriptionTypesEnabled(() => 'all') : setSubscriptionTypesEnabled(() => ({ customList: [...subscriptionTypes] }))}
          value={subscriptionTypesEnabled === 'all' ? 'all' : 'customList'}
        />
      </div>
      {subscriptionTypesEnabled !== 'all' && (() => {
        const list = subscriptionTypes.filter(t => !subscriptionTypesEnabled.customList.some(ste => ste === t)).map(c => ({ value: c, title: c })).sort((a, b) => a.title.localeCompare(b.title, 'en', { numeric: true }));
        return (
          <div className={sf.FormItem}>
            <ListInput<SubscriptionType>
              value={subscriptionTypesEnabled.customList.sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))}
              getId={(v) => v}
              renderItem={(v) => <div>{v}</div>}
              editor={(subscriptionTypes.length === subscriptionTypesEnabled.customList.length) ? undefined : {
                render: (v, onChange) => {
                  return (
                    <SelectInput<SubscriptionType>
                      list={list}
                      value={v}
                      onChange={(id) => onChange(id)}
                    />
                  )
                },
                initialValue: list[0].value,
              }}
              onRemove={async (id) => {
                setSubscriptionTypesEnabled(() => ({
                  customList: subscriptionTypesEnabled.customList.filter(r => r !== id)
                }));
              }}
              onAdd={(subscriptionTypes.length === subscriptionTypesEnabled.customList.length) ? undefined : async (v) => {
                setSubscriptionTypesEnabled(() => ({
                  customList: [...subscriptionTypesEnabled.customList, v]
                }));
              }}
              isValid={(_) => Either.right(undefined)}
            />
          </div>
        );
      })()}

      {showUpdateConfirmation && (
        <UpdateConfirmation
          onUpdate={() => props.onChange(subscriptionTypesEnabled)}
          onReset={() => setSubscriptionTypesEnabled(() => props.value)}
        />
      )}
    </div >
  );
}

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const adminClient = PulsarAdminClient.useContext().client;
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig()

  const onUpdateError = (err: string) => notifyError(`Can't update subscription types enabled. ${err}`);
  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: subscriptionTypesEnabled, error: subscriptionTypesEnabledError } = useSWR(
    swrKey,
    async () => await adminClient.namespaces.getSubscriptionTypesEnabled(props.tenant, props.namespace)
  );

  if (subscriptionTypesEnabledError) {
    notifyError(`Unable to get subscription types enabled. ${subscriptionTypesEnabledError}`);
  }

  return (
    <SubscriptionTypesEnabledInput
      value={(subscriptionTypesEnabled === undefined || subscriptionTypesEnabled.length === 0) ? 'all' : { customList: subscriptionTypesEnabled }}
      onChange={async (v) => {
        if (v === 'all') {
          await adminClient.namespaces.removeSubscriptionTypesEnabled(props.tenant, props.namespace).catch(onUpdateError);
        } else {
          await adminClient.namespaces.setSubscriptionTypesEnabled(props.tenant, props.namespace, v.customList).catch(onUpdateError);
        }

        await mutate(swrKey);
      }}
    />
  );
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Subscription types enabled',
  description: <span>Subscription types enabled for a namespace.</span>,
  input: <FieldInput {...props} />
});

export default field;
