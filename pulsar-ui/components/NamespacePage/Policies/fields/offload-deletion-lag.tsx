import * as Notifications from '../../../contexts/Notifications';
import * as PulsarAdminClient from '../../../contexts/PulsarAdminClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ConfigurationTable/ConfigurationTable";
import SelectInput from '../../../ConfigurationTable/SelectInput/SelectInput';
import sf from '../../../ConfigurationTable/form.module.css';
import { useEffect, useState } from 'react';
import UpdateConfirmation from '../../../ConfigurationTable/UpdateConfirmation/UpdateConfirmation';
import { Duration } from '../../../ConfigurationTable/DurationInput/types';
import { durationToSeconds, secondsToDuration } from '../../../ConfigurationTable/DurationInput/conversions';
import DurationInput from '../../../ConfigurationTable/DurationInput/DurationInput';
import { swrKeys } from '../../../swrKeys';

const policy = 'offloadDeletionLag';

type OffloadDeletionLag = 'disabled' | {
  duration: Duration;
};

const defaultOffloadDeletionLag: OffloadDeletionLag = {
  duration: {
    value: 14,
    unit: 'd'
  }
};

type OffloadDeletionLagInputProps = {
  value: OffloadDeletionLag;
  onChange: (value: OffloadDeletionLag) => void;
}

const OffloadDeletionLagInput: React.FC<OffloadDeletionLagInputProps> = (props) => {
  const [offloadDeletionLag, setOffloadDeletionLag] = useState<OffloadDeletionLag>(props.value);

  useEffect(() => {
    setOffloadDeletionLag(() => props.value);
  }, [props.value]);

  const showUpdateConfirmation = JSON.stringify(props.value) !== JSON.stringify(offloadDeletionLag);

  return (
    <div>
      <div className={sf.FormItem}>
        <SelectInput<'enabled' | 'disabled'>
          list={[{ value: 'disabled', title: 'Disabled' }, { value: 'enabled', title: 'Enabled' }]}
          value={offloadDeletionLag === 'disabled' ? 'disabled' : 'enabled'}
          onChange={(v) => v === 'disabled' ? setOffloadDeletionLag('disabled') : setOffloadDeletionLag(defaultOffloadDeletionLag)}
        />
      </div>
      {offloadDeletionLag !== 'disabled' && (
        <DurationInput
          value={offloadDeletionLag.duration}
          onChange={(v) => setOffloadDeletionLag({ duration: v })}
        />
      )}
      {showUpdateConfirmation && (
        <UpdateConfirmation
          onUpdate={() => props.onChange(offloadDeletionLag)}
          onReset={() => setOffloadDeletionLag(props.value)}
        />
      )}
    </div>
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

  const onUpdateError = (err: string) => notifyError(`Can't update offload deletion lag. ${err}`);
  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: offloadDeletionLag, error: offloadDeletionLagError } = useSWR(
    swrKey,
    async () => await adminClient.namespaces.getOffloadDeletionLag(props.tenant, props.namespace)
  );

  if (offloadDeletionLagError) {
    notifyError(`Unable to get offload deletion lag. ${offloadDeletionLagError}`);
  }

  return (
    <OffloadDeletionLagInput
      value={(offloadDeletionLag === undefined || offloadDeletionLag < 0) ? 'disabled' : { duration: secondsToDuration(offloadDeletionLag) }}
      onChange={async (v) => {
        if (v === 'disabled') {
          await adminClient.namespaces.setOffloadDeletionLag(props.tenant, props.namespace, -1).catch(onUpdateError);
        } else {
          await adminClient.namespaces.setOffloadDeletionLag(
            props.tenant,
            props.namespace,
            durationToSeconds(v.duration)
          ).catch(onUpdateError);
        }

        await mutate(swrKey);
      }}
    />
  )
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Offload deletion lag',
  description: <span>Duration to wait after offloading a ledger segment, before deleting the copy of that segment from cluster local storage.</span>,
  input: <FieldInput {...props} />
});

export default field;
