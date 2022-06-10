import SelectInput from "../../../ConfigurationTable/SelectInput/SelectInput";
import * as Notifications from '../../../contexts/Notifications';
import * as PulsarAdminClient from '../../../contexts/PulsarAdminClient';
import * as Either from 'fp-ts/lib/Either';
import useSWR, { useSWRConfig } from "swr";
import ListInput from "../../../ConfigurationTable/ListInput/ListInput";
import { ConfigurationField } from "../../../ConfigurationTable/ConfigurationTable";
import s from './backlog-quota.module.css';
import MemorySizeInput, { MemorySize } from "../../../ConfigurationTable/MemorySizeInput/MemorySizeInput";

export const backlogType = ['destination_storage', 'message_age'] as const;
export type BacklogType = typeof backlogType[number];

export const backlogPolicy = ['producer_request_hold', 'producer_exception', 'consumer_backlog_eviction'] as const;
export type BacklogPolicy = typeof backlogPolicy[number];

type BacklogQuota = {
  sizeLimit: MemorySize;
  limitTime: number;
  policy: BacklogPolicy;
  type: BacklogType;
}

type BacklogQuotaInputProps = {
  quota: BacklogQuota;
  onChange: (backlogQuota: BacklogQuota) => void;
}
const BacklogQuotaInput: React.FC<BacklogQuotaInputProps> = (props) => {
  return (
    <div className={s.BacklogQuotaInput}>
      <MemorySizeInput
        value={props.quota.sizeLimit}
        onChange={(sizeLimit) => props.onChange({ ...props.quota, sizeLimit })}
      />
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

  const onUpdateError = (err: string) => notifyError(`Can't update subscription types enabled. ${err}`);
  const swrKey = ['pulsar', 'tenants', props.tenant, 'namespaces', props.namespace, 'policies', 'backlogQuota'];

  const { data: subscriptionTypesEnabled, error: subscriptionTypesEnabledError } = useSWR(
    swrKey,
    async () => await adminClient.namespaces.getBacklogQuotaMap(props.tenant, props.namespace)
  );

  if (subscriptionTypesEnabledError) {
    notifyError(`Unable to get subscription types enabled. ${subscriptionTypesEnabledError}`);
  }

  return (
    <div>
      <div>
        <span>Destination storage</span>
        <BacklogQuotaInput
          quota={{
            type: "message_age",
            limitTime: 0,
            policy: 'producer_request_hold',
            sizeLimit: { size: 0, unit: 'M' }
          }}
          onChange={(quota) => undefined}
        />
      </div>
      <div>
        <span>Message age</span>
        <BacklogQuotaInput
          quota={{
            type: "message_age",
            limitTime: 0,
            policy: "producer_request_hold",
            sizeLimit: { size: 0, unit: 'M' }
          }}
          onChange={(quota) => undefined}
        />
      </div>
    </div>
  );
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: 'backlogQuota',
  title: 'Backlog quota',
  description: 'TODO',
  input: <FieldInput {...props} />
});

export default field;

