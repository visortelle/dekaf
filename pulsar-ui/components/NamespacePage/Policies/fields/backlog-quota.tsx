import SelectInput from "../../../ConfigurationTable/SelectInput/SelectInput";
import * as Notifications from '../../../contexts/Notifications';
import * as PulsarAdminClient from '../../../contexts/PulsarAdminClient';
import * as Either from 'fp-ts/lib/Either';
import useSWR, { useSWRConfig } from "swr";
import ListInput from "../../../ConfigurationTable/ListInput/ListInput";
import { ConfigurationField } from "../../../ConfigurationTable/ConfigurationTable";
import s from './backlog-quota.module.css';
import MemorySizeInput from "../../../ConfigurationTable/MemorySizeInput/MemorySizeInput";
import { memoryToBytes, bytesToMemorySize } from "../../../ConfigurationTable/MemorySizeInput/conversions";
import { MemorySize } from "../../../ConfigurationTable/MemorySizeInput/types";
import Input from "../../../ConfigurationTable/Input/Input";

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

type BacklogQuotaInputProps = {
  quota: BacklogQuota;
  onChange: (backlogQuota: BacklogQuota) => void;
  disabledInputs?: ('type')[]
  backlogTypes: BacklogType[];
}
const BacklogQuotaInput: React.FC<BacklogQuotaInputProps> = (props) => {
  return (
    <div className={s.BacklogQuotaInput}>
      <div className={s.FormItem}>
        <strong className={s.FormLabel}>Type</strong>
        <SelectInput
          list={props.backlogTypes.map(p => ({ id: p, title: p }))}
          onChange={(type) => props.onChange({ ...props.quota, type: type as BacklogType })}
          value={props.quota.type}
          disabled={props.disabledInputs?.includes('type')}
        />
      </div>
      <div className={s.FormItem}>
        <strong className={s.FormLabel}>Size limit</strong>
        <MemorySizeInput
          value={props.quota.sizeLimit}
          onChange={(sizeLimit) => props.onChange({ ...props.quota, sizeLimit })}
        />
      </div>
      <div className={s.FormItem}>
        <strong className={s.FormLabel}>Limit time (sec.)</strong>
        <Input type="number" value={props.quota.limitTime.toString()} onChange={(time) => props.onChange({ ...props.quota, limitTime: Number(time) })} />
      </div>
      <div className={s.FormItem}>
        <strong className={s.FormLabel}>Policy</strong>
        <SelectInput
          list={backlogPolicies.map(p => ({ id: p, title: p }))}
          onChange={(policy) => props.onChange({ ...props.quota, policy: policy as BacklogPolicy })}
          value={props.quota.policy}
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
  const swrKey = ['pulsar', 'tenants', props.tenant, 'namespaces', props.namespace, 'policies', 'backlogQuota'];

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
            <BacklogQuotaInput
              disabledInputs={['type']}
              backlogTypes={[...backlogTypes]}
              quota={quota}
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
                quota={quota}
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
  id: 'backlogQuota',
  title: 'Backlog quota',
  description: 'TODO',
  input: <FieldInput {...props} />
});

export default field;
