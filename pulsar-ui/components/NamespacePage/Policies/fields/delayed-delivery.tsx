import SelectInput from "../../../ui/ConfigurationTable/SelectInput/SelectInput";
import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarAdminClient from '../../../app/contexts/PulsarAdminClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import DurationInput from "../../../ui/ConfigurationTable/DurationInput/DurationInput";
import { Duration } from "../../../ui/ConfigurationTable/DurationInput/types";
import { secondsToDuration, durationToSeconds } from "../../../ui/ConfigurationTable/DurationInput/conversions";
import UpdateConfirmation from '../../../ui/ConfigurationTable/UpdateConfirmation/UpdateConfirmation';
import sf from '../../../ui/ConfigurationTable/form.module.css';
import { useEffect, useState } from "react";
import { swrKeys } from "../../../swrKeys";

const policy = 'delayedDelivery';

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

type DelayedDelivery = {
  enabled: 'enabled' | 'disabled';
  time: Duration
};

type DelayedDeliveryInputProps = {
  value: DelayedDelivery;
  onChange: (value: DelayedDelivery) => void;
}

const DelayedDeliveryInput: React.FC<DelayedDeliveryInputProps> = (props) => {
  const [delayedDelivery, setDelayedDelivery] = useState<DelayedDelivery>(props.value);

  useEffect(() => {
    setDelayedDelivery(() => props.value);
  }, [props.value]);

  const showUpdateConfirmation = JSON.stringify(props.value) !== JSON.stringify(delayedDelivery);

  return (
    <div>
      <div className={sf.FormItem}>
        <SelectInput<DelayedDelivery['enabled']>
          list={[{ value: 'disabled', title: 'Disabled' }, { value: 'enabled', title: 'Enabled' }]}
          value={delayedDelivery.enabled}
          onChange={(v) => setDelayedDelivery({ ...delayedDelivery, enabled: v })}
        />
      </div>
      {delayedDelivery.enabled === 'enabled' && (
        <div className={sf.FormItem}>
          <strong className={sf.FormLabel}>Tick time</strong>
          <DurationInput
            value={delayedDelivery.time}
            onChange={async (v) => setDelayedDelivery({ ...delayedDelivery, time: v })}
          />
        </div>
      )}

      {showUpdateConfirmation && (
        <UpdateConfirmation
          onUpdate={() => props.onChange(delayedDelivery)}
          onReset={() => setDelayedDelivery(props.value)}
        />
      )}
    </div >
  );
}

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const adminClient = PulsarAdminClient.useContext().client;
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();

  const onUpdateError = (err: string) => notifyError(`Can't update delayed delivery. ${err}`);
  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: delayedDelivery, error: delayedDeliveryError } = useSWR(
    swrKey,
    async () => await adminClient.namespaces.getDelayedDeliveryPolicies(props.tenant, props.namespace)
  );

  if (delayedDeliveryError) {
    notifyError(`Unable to get delayed delivery: ${delayedDeliveryError}`);
  }

  return (
    <DelayedDeliveryInput
      value={{ enabled: delayedDelivery?.active ? 'enabled' : 'disabled', time: secondsToDuration(delayedDelivery?.tickTime || 0) }}
      onChange={async (v) => {
        await adminClient.namespaces.setDelayedDeliveryPolicies(props.tenant, props.namespace, { active: v.enabled === 'enabled', tickTime: durationToSeconds(v.time) }).catch(onUpdateError);
        await mutate(swrKey);
      }}
    />
  );
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Delayed delivery',
  description: <span>Set the delayed delivery policy on a namespace.</span>,
  input: <FieldInput {...props} />
});

export default field;
