import SelectInput from "../../../ConfigurationTable/SelectInput/SelectInput";
import * as Notifications from '../../../contexts/Notifications';
import * as PulsarAdminClient from '../../../contexts/PulsarAdminClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ConfigurationTable/ConfigurationTable";
import sf from '../../../ConfigurationTable/form.module.css';
import MemorySizeInput from "../../../ConfigurationTable/MemorySizeInput/MemorySizeInput";
import { memoryToBytes, bytesToMemorySize } from "../../../ConfigurationTable/MemorySizeInput/conversions";
import { MemorySize } from "../../../ConfigurationTable/MemorySizeInput/types";
import DurationInput from "../../../ConfigurationTable/DurationInput/DurationInput";
import { secondsToDuration, durationToSeconds } from "../../../ConfigurationTable/DurationInput/conversions";
import UpdateConfirmation from "../../../ConfigurationTable/UpdateConfirmation/UpdateConfirmation";
import { useEffect, useState } from "react";
import { Duration } from "../../../ConfigurationTable/DurationInput/types";
import { swrKeys } from "../../../swrKeys";

const policy = 'retention';

const bytesInMegabyte = 1024 * 1024;
const secondsInMinute = 60;

type Retention = 'disabled' | {
  size: 'infinite' | MemorySize;
  time: 'infinite' | Duration;
}

type RetentionInputWithUpdateConfirmationProps = {
  onChange: RetentionInputProps['onChange'];
  value: RetentionInputProps['value'];
}
const RetentionInputWithUpdateConfirmation: React.FC<RetentionInputWithUpdateConfirmationProps> = (props) => {
  const [value, setValue] = useState(props.value);

  useEffect(() => {
    setValue(() => props.value);
  }, [props.value]);

  const handleUpdate = () => props.onChange(value);

  return (
    <div
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          handleUpdate();
        }
      }}
    >
      <RetentionInput
        value={value}
        onChange={(v) => setValue(() => v)}
      />
      {JSON.stringify(props.value) !== JSON.stringify(value) && (
        <UpdateConfirmation
          onUpdate={handleUpdate}
          onReset={() => setValue(props.value)}
        />
      )}
    </div>
  )
}

type RetentionInputProps = {
  value: Retention;
  onChange: (retention: Retention) => void;
}
const RetentionInput: React.FC<RetentionInputProps> = (props) => {
  const [retention, setRetention] = useState<Retention>(props.value);

  useEffect(() => {
    setRetention(() => props.value);
  }, [props.value]);

  useEffect(() => {
    props.onChange(retention);
  }, [retention]);

  return (
    <div>
      <div className={sf.FormItem}>
        <SelectInput<'enabled' | 'disabled'>
          list={[{ value: 'disabled', title: 'Disabled' }, { value: 'enabled', title: 'Enabled' }]}
          onChange={(v) => setRetention(() => v === 'disabled' ? 'disabled' : { size: 'infinite', time: 'infinite' })}
          value={retention === 'disabled' ? 'disabled' : 'enabled'}
        />
      </div>
      {retention !== 'disabled' && (
        <div>
          <strong className={sf.FormLabel}>Size</strong>
          <div className={sf.FormItem}>
            <SelectInput<'infinite' | 'custom'>
              list={[{ value: 'infinite', title: 'Infinite' }, { value: 'custom', title: 'Custom' }]}
              onChange={(v) => setRetention(() => ({ ...retention, size: v === 'infinite' ? 'infinite' : { size: 1, unit: 'M' } }))}
              value={retention.size === 'infinite' ? 'infinite' : 'custom'}
            />
          </div>
          {retention.size !== 'infinite' && (
            <div className={sf.FormItem}>
              <MemorySizeInput
                value={retention.size}
                onChange={(v) => setRetention(() => ({ ...retention, size: v }))}
              />
            </div>
          )}

          <strong className={sf.FormLabel}>Time</strong>
          <div className={sf.FormItem}>
            <SelectInput<'infinite' | 'custom'>
              list={[{ value: 'infinite', title: 'Infinite' }, { value: 'custom', title: 'Custom' }]}
              onChange={(v) => setRetention(() => ({ ...retention, time: v === 'infinite' ? 'infinite' : { value: 14, unit: 'd' } }))}
              value={retention.time === 'infinite' ? 'infinite' : 'custom'}
            />
          </div>
          {retention.time !== 'infinite' && (
            <div className={sf.FormItem}>
              <DurationInput
                value={retention.time}
                onChange={(v) => {
                  setRetention(() => ({ ...retention, time: v }));
                }}
              />
            </div>
          )}
        </div>
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

  const onUpdateError = (err: string) => notifyError(`Can't update retention. ${err}`);
  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: retentionData, error: retentionError } = useSWR(
    swrKey,
    async () => await adminClient.namespaces.getRetention(props.tenant, props.namespace)
  );

  if (retentionError) {
    notifyError(`Unable to get retention. ${retentionError}`);
  }

  const retention: Retention = retentionData === undefined ? 'disabled' : {
    size: retentionData.retentionSizeInMB === -1 ? 'infinite' : bytesToMemorySize((retentionData.retentionSizeInMB || 0) * bytesInMegabyte),
    time: retentionData.retentionTimeInMinutes === -1 ? 'infinite' : secondsToDuration((retentionData.retentionTimeInMinutes || 0) * secondsInMinute)
  };

  return (
    <RetentionInputWithUpdateConfirmation
      value={retention}
      onChange={async (v) => {
        if (v === 'disabled') {
          await adminClient.namespaces.removeRetention(props.tenant, props.namespace);
        } else {
          await adminClient.namespaces.setRetention(props.tenant, props.namespace, {
            retentionSizeInMB: v.size === 'infinite' ? -1 : memoryToBytes(v.size) / bytesInMegabyte,
            retentionTimeInMinutes: v.time === 'infinite' ? -1 : durationToSeconds(v.time) / secondsInMinute,
          }).catch(onUpdateError);
        }

        await mutate(swrKey);
      }}
    />
  );
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Retention',
  description: <span>By default, when a Pulsar message arrives at a broker, the message is stored until it has been acknowledged on all subscriptions, at which point it is marked for deletion.<br />You can override this behavior and retain messages that have already been acknowledged on all subscriptions by setting a retention policy.</span>,
  input: <FieldInput {...props} />
});

export default field;
