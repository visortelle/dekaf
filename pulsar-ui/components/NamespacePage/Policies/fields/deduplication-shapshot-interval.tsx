import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarAdminClient from '../../../app/contexts/PulsarAdminClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import SelectInput from '../../../ui/ConfigurationTable/SelectInput/SelectInput';
import sf from '../../../ui/ConfigurationTable/form.module.css';
import { useEffect, useState } from 'react';
import UpdateConfirmation from '../../../ui/ConfigurationTable/UpdateConfirmation/UpdateConfirmation';
import { Duration } from '../../../ui/ConfigurationTable/DurationInput/types';
import { durationToSeconds, secondsToDuration } from '../../../ui/ConfigurationTable/DurationInput/conversions';
import DurationInput from '../../../ui/ConfigurationTable/DurationInput/DurationInput';
import { swrKeys } from '../../../swrKeys';
import { isEqual } from 'lodash';

const policy = 'deduplicationSnapshotInterval';

type DeduplicationSnapshotInterval = 'disabled' | {
  duration: Duration;
};

const defaultDeduplicationSnapshotInterval: DeduplicationSnapshotInterval = {
  duration: {
    value: 0,
    unit: 's'
  }
};

type DeduplicationSnapshotIntervalInputProps = {
  value: DeduplicationSnapshotInterval;
  onChange: (value: DeduplicationSnapshotInterval) => void;
}

const DeduplicationSnapshotIntervalInput: React.FC<DeduplicationSnapshotIntervalInputProps> = (props) => {
  const [duplicationSnapshotInterval, setDeduplicationSnapshotInterval] = useState<DeduplicationSnapshotInterval>(props.value);

  useEffect(() => {
    setDeduplicationSnapshotInterval(() => props.value);
  }, [props.value]);

  const showUpdateConfirmation = !isEqual(props.value, duplicationSnapshotInterval);

  return (
    <div>
      <div className={sf.FormItem}>
        <SelectInput<'enabled' | 'disabled'>
          list={[{ type: 'item', value: 'disabled', title: 'Disabled' }, { type: 'item', value: 'enabled', title: 'Enabled' }]}
          value={duplicationSnapshotInterval === 'disabled' ? 'disabled' : 'enabled'}
          onChange={(v) => v === 'disabled' ? setDeduplicationSnapshotInterval('disabled') : setDeduplicationSnapshotInterval(defaultDeduplicationSnapshotInterval)}
        />
      </div>
      {duplicationSnapshotInterval !== 'disabled' && (
        <DurationInput
          value={duplicationSnapshotInterval.duration}
          onChange={(v) => setDeduplicationSnapshotInterval({ duration: v })}
        />
      )}
      {showUpdateConfirmation && (
        <UpdateConfirmation
          onUpdate={() => props.onChange(duplicationSnapshotInterval)}
          onReset={() => setDeduplicationSnapshotInterval(props.value)}
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

  const { data: duplicationSnapshotInterval, error: duplicationSnapshotIntervalError } = useSWR(
    swrKey,
    async () => await adminClient.namespaces.getDeduplicationSnapshotInterval(props.tenant, props.namespace)
  );

  if (duplicationSnapshotIntervalError) {
    notifyError(`Unable to deduplication snapshot interval. ${duplicationSnapshotIntervalError}`);
  }

  return (
    <DeduplicationSnapshotIntervalInput
      value={duplicationSnapshotInterval === undefined ? 'disabled' : { duration: secondsToDuration(duplicationSnapshotInterval) }}
      onChange={async (v) => {
        if (v === 'disabled') {
          // XXX - https://github.com/apache/pulsar/issues/16073
          await adminClient.namespaces.setDeduplicationSnapshotInterval(props.tenant, props.namespace, undefined as unknown as number).catch(onUpdateError);
        } else {
          await adminClient.namespaces.setDeduplicationSnapshotInterval(
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
  title: 'Deduplication snapshot interval',
  description: <span>Deduplication snapshot interval. <code>brokerDeduplicationEnabled</code> must be set to true for this property to take effect.</span>,
  input: <FieldInput {...props} />
});

export default field;
