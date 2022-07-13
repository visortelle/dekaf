import SelectInput from "../../../ui/ConfigurationTable/SelectInput/SelectInput";
import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarAdminClient from '../../../app/contexts/PulsarAdminClient';
import useSWR, { useSWRConfig } from "swr";
import ListInput from "../../../ui/ConfigurationTable/ListInput/ListInput";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import s from './backlog-quota.module.css';
import sf from '../../../ui/ConfigurationTable/form.module.css';
import MemorySizeInput from "../../../ui/ConfigurationTable/MemorySizeInput/MemorySizeInput";
import { memoryToBytes, bytesToMemorySize } from "../../../ui/ConfigurationTable/MemorySizeInput/conversions";
import { MemorySize } from "../../../ui/ConfigurationTable/MemorySizeInput/types";
import DurationInput from "../../../ui/ConfigurationTable/DurationInput/DurationInput";
import { secondsToDuration, durationToSeconds } from "../../../ui/ConfigurationTable/DurationInput/conversions";
import UpdateConfirmation from "../../../ui/ConfigurationTable/UpdateConfirmation/UpdateConfirmation";
import { useEffect, useState } from "react";
import * as Either from 'fp-ts/Either';
import { swrKeys } from "../../../swrKeys";
import { isEqual } from "lodash";

const policy = 'backlogQuota';

export const backlogTypes = ['destination_storage', 'message_age'] as const;
export type BacklogType = typeof backlogTypes[number];

export const backlogPolicies = ['producer_request_hold', 'producer_exception', 'consumer_backlog_eviction'] as const;
export type BacklogPolicy = typeof backlogPolicies[number];

type BacklogQuota = {
  sizeLimit: MemorySize;
  limitTime: number;
  policy: BacklogPolicy;
  type: BacklogType;
}

type BacklogQuotaInputWithUpdateConfirmationProps = {
  onChange: BacklogQuotaInputProps['onChange'];
  value: BacklogQuotaInputProps['value'];
}
const BacklogQuotaInputWithUpdateConfirmation: React.FC<BacklogQuotaInputWithUpdateConfirmationProps> = (props) => {
  const [value, setValue] = useState(props.value);

  useEffect(() => {
    setValue(() => props.value);
  }, [props.value]);

  const handleUpdate = () => props.onChange(value);

  return (
    <div
      className={s.ListItem}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          handleUpdate();
        }
      }}
    >
      <BacklogQuotaInput
        disabledInputs={['type']}
        backlogTypes={[...backlogTypes]}
        value={value}
        onChange={(v) => setValue(() => v)}
      />
      {!isEqual(props.value, value) && (
        <UpdateConfirmation
          onUpdate={handleUpdate}
          onReset={() => setValue(props.value)}
        />
      )}
    </div>
  )
}

type BacklogQuotaInputProps = {
  value: BacklogQuota;
  onChange: (backlogQuota: BacklogQuota) => void;
  disabledInputs?: ('type')[]
  backlogTypes: BacklogType[];
}
const BacklogQuotaInput: React.FC<BacklogQuotaInputProps> = (props) => {
  return (
    <div className={s.BacklogQuotaInput}>
      <div className={sf.FormItem}>
        <strong className={sf.FormLabel}>Type</strong>
        <SelectInput<BacklogType>
          list={props.backlogTypes.map(p => ({ type: 'item', value: p, title: p }))}
          onChange={(type) => props.onChange({ ...props.value, type: type as BacklogType })}
          value={props.value.type}
          disabled={props.disabledInputs?.includes('type')}
        />
      </div>
      <div className={sf.FormItem}>
        <strong className={sf.FormLabel}>Size limit</strong>
        <MemorySizeInput
          value={props.value.sizeLimit}
          onChange={(sizeLimit) => props.onChange({ ...props.value, sizeLimit })}
        />
      </div>
      <div className={sf.FormItem}>
        <strong className={sf.FormLabel}>Limit time (sec.)</strong>

        <div className={sf.FormItem}>
          <SelectInput<'enabled' | 'disabled'>
            value={props.value.limitTime > 0 ? 'enabled' : 'disabled'}
            list={[{ type: 'item', value: 'enabled', title: 'Enabled' }, { type: 'item', value: 'disabled', title: 'Disabled' }]}
            onChange={(v) => {
              switch (v) {
                case 'enabled':
                  props.onChange({ ...props.value, limitTime: props.value.limitTime > 0 ? props.value.limitTime : 1 });
                  break;
                case 'disabled':
                  props.onChange({ ...props.value, limitTime: -1 });
                  break;
              }
            }}
          />
        </div>
        {props.value.limitTime > 0 && (
          <DurationInput
            value={secondsToDuration(props.value.limitTime)}
            onChange={(limitTime) => props.onChange({ ...props.value, limitTime: durationToSeconds(limitTime) })}
          />
        )}
      </div>
      <div className={sf.FormItem}>
        <strong className={sf.FormLabel}>Policy</strong>
        <SelectInput<BacklogPolicy>
          list={backlogPolicies.map(p => ({ type: 'item', value: p, title: p }))}
          onChange={(policy) => props.onChange({ ...props.value, policy: policy as BacklogPolicy })}
          value={props.value.policy}
        />
      </div>
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

  const onUpdateError = (err: string) => notifyError(`Can't update backlog quota. ${err}`);
  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: backlogQuota, error: backlogQuotaError } = useSWR(
    swrKey,
    async () => await adminClient.namespaces.getBacklogQuotaMap(props.tenant, props.namespace)
  );

  if (backlogQuotaError) {
    notifyError(`Unable to get backlog quota. ${backlogQuotaError}`);
  }

  const hideAddButton = Object.keys(backlogQuota || {}).length === backlogTypes.length;

  return (
    <ListInput<BacklogQuota>
      getId={(v) => v.type}
      isValid={_ => Either.right(undefined)}
      value={Object.keys(backlogQuota || {}).map((type) => {
        const quota = backlogQuota![type];

        const q: BacklogQuota = {
          type: type as BacklogType,
          limitTime: quota.limitTime!,
          policy: quota.policy || 'producer_request_hold',
          sizeLimit: bytesToMemorySize(quota.limitSize || 0),
        };

        return q;
      })}
      renderItem={(quota) => {
        return (
          <div className={s.ListItem}>
            <BacklogQuotaInputWithUpdateConfirmation
              value={quota}
              onChange={async (quota) => {
                const limitSize = memoryToBytes(quota.sizeLimit);
                await adminClient.namespaces.setBacklogQuota(props.tenant, props.namespace, quota.type, {
                  limit: limitSize,
                  limitSize,
                  limitTime: quota.limitTime,
                  policy: quota.policy,
                }).catch(onUpdateError);
                await mutate(swrKey);
              }}
            />
          </div>
        );
      }}
      onRemove={async (type) => {
        await adminClient.namespaces.removeBacklogQuota(props.tenant, props.namespace, type as BacklogType).catch(onUpdateError);
        await mutate(swrKey);
      }}
      editor={hideAddButton ? undefined : (() => {
        const bt = [...backlogTypes.filter(t => !Object.keys(backlogQuota || {}).some(type => type === t))];
        return {
          render: (quota, onChange) => {
            return (
              <BacklogQuotaInput
                backlogTypes={bt}
                value={quota}
                onChange={onChange}
              />
            )
          },
          initialValue: {
            sizeLimit: bytesToMemorySize(1024 * 1024 * 1024),
            limitTime: -1,
            policy: 'producer_request_hold',
            type: bt[0],
          }
        }
      })()}
      onAdd={hideAddButton ? undefined : async (quota) => {
        const limitSize = memoryToBytes(quota.sizeLimit);
        await adminClient.namespaces.setBacklogQuota(props.tenant, props.namespace, quota.type, {
          limit: limitSize,
          limitSize,
          limitTime: quota.limitTime,
          policy: quota.policy,
        }).catch(onUpdateError);
        await mutate(swrKey);
      }}
    />
  );
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Backlog quotas',
  description: <span>Backlogs are sets of unacknowledged messages for a topic that have been stored by bookies. <br />Pulsar stores all unacknowledged messages in backlogs until they are processed and acknowledged.</span>,
  input: <FieldInput {...props} />
});

export default field;
