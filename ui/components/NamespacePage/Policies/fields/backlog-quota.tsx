import Select from "../../../ui/Select/Select";
import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import s from './backlog-quota.module.css';
import sf from '../../../ui/ConfigurationTable/form.module.css';
import MemorySizeInput from "../../../ui/ConfigurationTable/MemorySizeInput/MemorySizeInput";
import DurationInput from "../../../ui/ConfigurationTable/DurationInput/DurationInput";
import { swrKeys } from "../../../swrKeys";
import WithUpdateConfirmation from "../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation";
import * as pb from "../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb";
import { Code } from "../../../../grpc-web/google/rpc/code_pb";
import stringify from "safe-stable-stringify";

const policy = 'backlogQuota';

type RetentionPolicy = 'consumer_backlog_eviction' | 'producer_request_hold' | 'producer_exception';

function retentionPolicyFromPb(policyPb: pb.BacklogQuotaRetentionPolicy): RetentionPolicy {
  switch (policyPb) {
    case pb.BacklogQuotaRetentionPolicy.BACKLOG_QUOTA_RETENTION_POLICY_CONSUMER_BACKLOG_EVICTION: return 'consumer_backlog_eviction';
    case pb.BacklogQuotaRetentionPolicy.BACKLOG_QUOTA_RETENTION_POLICY_PRODUCER_EXCEPTION: return 'producer_exception';
    case pb.BacklogQuotaRetentionPolicy.BACKLOG_QUOTA_RETENTION_POLICY_PRODUCER_REQUEST_HOLD: return 'producer_request_hold';
    default: throw new Error(`Unknown retention policy: ${policyPb}`);
  }
}

type PolicyValue = {
  destinationStorage: { type: 'inherited-from-broker-config' } | {
    type: 'specified-for-this-namespace';
    limit: { type: 'infinite' } | { type: 'specific', sizeBytes: number };
    policy: RetentionPolicy;
  },
  messageAge: { type: 'inherited-from-broker-config' } | {
    type: 'specified-for-this-namespace';
    limitTime: { type: 'infinite' } | { type: 'specific', durationSeconds: number };
    policy: RetentionPolicy;
  }
}

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const { namespaceServiceClient } = PulsarGrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig()

  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: initialValue, error: initialValueError } = useSWR(
    swrKey,
    async () => {
      const req = new pb.GetBacklogQuotasRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);
      const res = await namespaceServiceClient.getBacklogQuotas(req, {});

      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get backlog quotas for namespace. ${res.getStatus()?.getMessage()}`);
      }

      let v: PolicyValue = { destinationStorage: { type: 'inherited-from-broker-config' }, messageAge: { type: 'inherited-from-broker-config' } };

      const destinationStorage = res.getDestinationStorage();
      if (destinationStorage !== undefined) {
        v.destinationStorage = {
          type: 'specified-for-this-namespace',
          limit: destinationStorage.getLimitSize() === -1 ? { type: 'infinite' } : { type: 'specific', sizeBytes: destinationStorage.getLimitSize() },
          policy: retentionPolicyFromPb(destinationStorage.getRetentionPolicy())
        };
      }

      const messageAge = res.getMessageAge();
      if (messageAge !== undefined) {
        v.messageAge = {
          type: 'specified-for-this-namespace',
          limitTime: messageAge.getLimitTime() === -1 ? { type: 'infinite' } : { type: 'specific', durationSeconds: messageAge.getLimitTime() },
          policy: retentionPolicyFromPb(messageAge.getRetentionPolicy())
        };
      }
      return v;
    }
  );

  if (initialValueError) {
    notifyError(`Unable to get backlog quota policy. ${initialValueError}`);
  }

  if (initialValue === undefined) {
    return null;
  }

  const updatePolicy = async (v: PolicyValue): Promise<void> => {
    const req = new pb.SetBacklogQuotasRequest();
    req.setNamespace(`${props.tenant}/${props.namespace}`);

    let destinationStorageBacklogQuotaPb: pb.DestinationStorageBacklogQuota | undefined = undefined;
    if (v.destinationStorage.type === 'specified-for-this-namespace') {
      destinationStorageBacklogQuotaPb = new pb.DestinationStorageBacklogQuota();
      destinationStorageBacklogQuotaPb.setLimitSize(v.destinationStorage.limit.type === 'infinite' ? -1 : Math.floor(v.destinationStorage.limit.sizeBytes));
      destinationStorageBacklogQuotaPb.setRetentionPolicy(retentionPolicyToPb(v.destinationStorage.policy));
    }
    req.setDestinationStorage(destinationStorageBacklogQuotaPb)

    let messageAgeBacklogQuotaPb: pb.MessageAgeBacklogQuota | undefined = undefined;
    if (v.messageAge.type === 'specified-for-this-namespace') {
      messageAgeBacklogQuotaPb = new pb.MessageAgeBacklogQuota();
      messageAgeBacklogQuotaPb.setLimitTime(v.messageAge.limitTime.type === 'infinite' ? -1 : Math.floor(v.messageAge.limitTime.durationSeconds));
      messageAgeBacklogQuotaPb.setRetentionPolicy(retentionPolicyToPb(v.messageAge.policy));
    }
    req.setMessageAge(messageAgeBacklogQuotaPb)

    const res = await namespaceServiceClient.setBacklogQuotas(req, {}).catch(err => notifyError(`Unable to update backlog quota policy. ${err}`));
    if (res !== undefined && res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to update backlog quota policy. ${res.getStatus()?.getMessage()}`);
    }

    if (v.destinationStorage.type === 'inherited-from-broker-config') {
      const req = new pb.RemoveBacklogQuotaRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);
      req.setBacklogQuotaType(pb.BacklogQuotaType.BACKLOG_QUOTA_TYPE_DESTINATION_STORAGE);
      const res = await namespaceServiceClient.removeBacklogQuota(req, {}).catch(err => notifyError(`Unable to remove backlog quota policy. ${err}`));
      if (res !== undefined && res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to remove backlog quota policy. ${res.getStatus()?.getMessage()}`);
      }
    }

    if (v.messageAge.type === 'inherited-from-broker-config') {
      const req = new pb.RemoveBacklogQuotaRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);
      req.setBacklogQuotaType(pb.BacklogQuotaType.BACKLOG_QUOTA_TYPE_MESSAGE_AGE);
      const res = await namespaceServiceClient.removeBacklogQuota(req, {}).catch(err => notifyError(`Unable to remove backlog quota policy. ${err}`));
      if (res !== undefined && res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to remove backlog quota policy. ${res.getStatus()?.getMessage()}`);
      }
    }

    await mutate(swrKey);
  }

  return (
    <WithUpdateConfirmation<PolicyValue>
      key={stringify(initialValue)}
      initialValue={initialValue}
      onConfirm={updatePolicy}
    >
      {({ value, onChange }) => (
        <>
          <div className={s.Quota}>
            <div className={sf.FormLabel}>Destination storage</div>
            <div className={sf.FormItem}>
              <Select<'inherited-from-broker-config' | 'specified-for-this-namespace'>
                list={[
                  { type: 'item', value: 'inherited-from-broker-config', title: 'Inherited from broker config' },
                  { type: 'item', value: 'specified-for-this-namespace', title: 'Specified for this namespace' }
                ]}
                onChange={(v) => onChange({
                  ...value,
                  destinationStorage: v === 'inherited-from-broker-config' ? { type: 'inherited-from-broker-config' } : { type: 'specified-for-this-namespace', limit: { type: 'infinite' }, policy: 'producer_request_hold' }
                })}
                value={value.destinationStorage.type}
              />
            </div>

            {value.destinationStorage.type === 'specified-for-this-namespace' && (
              <div className={sf.FormItem}>
                <div className={sf.FormLabel}>Limit size</div>
                <Select<'infinite' | 'specific'>
                  list={[
                    { type: 'item', value: 'infinite', title: 'Infinite' },
                    { type: 'item', value: 'specific', title: 'Specific size' }
                  ]}
                  onChange={(v) => onChange({
                    ...value,
                    destinationStorage: {
                      ...value.destinationStorage,
                      type: 'specified-for-this-namespace',
                      limit: v === 'infinite' ? { type: 'infinite' } : { type: 'specific', sizeBytes: 1024 },
                      policy: 'producer_request_hold'
                    }
                  })}
                  value={value.destinationStorage.limit.type}
                />
              </div>
            )}

            {value.destinationStorage.type === 'specified-for-this-namespace' && value.destinationStorage.limit.type === 'specific' && (
              <div className={sf.FormItem}>
                <MemorySizeInput
                  initialValue={value.destinationStorage.limit.sizeBytes}
                  onChange={(v) => {
                    if (value.destinationStorage.type === 'inherited-from-broker-config') {
                      return;
                    }

                    onChange({
                      ...value,
                      destinationStorage: {
                        ...value.destinationStorage,
                        limit: { type: 'specific', sizeBytes: v }
                      }
                    })
                  }}
                />
              </div>
            )}

            {value.destinationStorage.type === 'specified-for-this-namespace' && (
              <div className={sf.FormItem}>
                <div className={sf.FormLabel}>Policy</div>
                <Select<RetentionPolicy>
                  list={[
                    { type: 'item', value: 'producer_request_hold', title: 'producer_request_hold' },
                    { type: 'item', value: 'producer_exception', title: 'producer_exception' },
                    { type: 'item', value: 'consumer_backlog_eviction', title: 'consumer_backlog_eviction' }
                  ]}
                  value={value.destinationStorage.policy}
                  onChange={(v) => {
                    if (value.destinationStorage.type === 'inherited-from-broker-config') {
                      return;
                    }
                    onChange({
                      ...value,
                      destinationStorage: {
                        ...value.destinationStorage,
                        policy: v
                      }
                    })
                  }}
                />
              </div>
            )}
          </div>

          <div className={s.Quota}>
            <div className={sf.FormLabel}>Message age</div>
            <div className={sf.FormItem}>
              <Select<'inherited-from-broker-config' | 'specified-for-this-namespace'>
                list={[
                  { type: 'item', value: 'inherited-from-broker-config', title: 'Inherited from broker config' },
                  { type: 'item', value: 'specified-for-this-namespace', title: 'Specified for this namespace' }
                ]}
                onChange={(v) => onChange({
                  ...value,
                  messageAge: v === 'inherited-from-broker-config' ? { type: 'inherited-from-broker-config' } : { type: 'specified-for-this-namespace', limitTime: { type: 'infinite' }, policy: 'producer_request_hold' }
                })}
                value={value.messageAge.type}
              />
            </div>

            {value.messageAge.type === 'specified-for-this-namespace' && (
              <div className={sf.FormItem}>
                <div className={sf.FormLabel}>Limit time</div>
                <Select<'infinite' | 'specific'>
                  list={[
                    { type: 'item', value: 'infinite', title: 'Infinite' },
                    { type: 'item', value: 'specific', title: 'Specific duration' }
                  ]}
                  onChange={(v) => onChange({
                    ...value,
                    messageAge: {
                      ...value.messageAge,
                      type: 'specified-for-this-namespace',
                      limitTime: v === 'infinite' ? { type: 'infinite' } : { type: 'specific', durationSeconds: 14 * 24 * 60 * 60 },
                      policy: 'producer_request_hold'
                    }
                  })}
                  value={value.messageAge.limitTime.type}
                />
              </div>
            )}

            {value.messageAge.type === 'specified-for-this-namespace' && value.messageAge.limitTime.type === 'specific' && (
              <div className={sf.FormItem}>
                <DurationInput
                  initialValue={value.messageAge.limitTime.durationSeconds}
                  onChange={(v) => {
                    if (value.messageAge.type === 'inherited-from-broker-config') {
                      return;
                    }

                    onChange({
                      ...value,
                      messageAge: {
                        ...value.messageAge,
                        limitTime: { type: 'specific', durationSeconds: v }
                      }
                    })
                  }}
                />
              </div>
            )}

            {value.messageAge.type === 'specified-for-this-namespace' && (
              <div className={sf.FormItem}>
                <div className={sf.FormLabel}>Policy</div>
                <Select<RetentionPolicy>
                  list={[
                    { type: 'item', value: 'producer_request_hold', title: 'producer_request_hold' },
                    { type: 'item', value: 'producer_exception', title: 'producer_exception' },
                    { type: 'item', value: 'consumer_backlog_eviction', title: 'consumer_backlog_eviction' }
                  ]}
                  value={value.messageAge.policy}
                  onChange={(v) => {
                    if (value.messageAge.type === 'inherited-from-broker-config') {
                      return;
                    }
                    onChange({
                      ...value,
                      messageAge: {
                        ...value.messageAge,
                        policy: v
                      }
                    })
                  }}
                />
              </div>
            )}
          </div>
        </>
      )}
    </WithUpdateConfirmation>
  );
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Backlog quotas',
  description: <span>Backlogs are sets of unacknowledged messages for a topic that have been stored by bookies. <br />Pulsar stores all unacknowledged messages in backlogs until they are processed and acknowledged.</span>,
  input: <FieldInput {...props} />
});

function retentionPolicyToPb(value: RetentionPolicy): pb.BacklogQuotaRetentionPolicy {
  switch (value) {
    case 'producer_request_hold':
      return pb.BacklogQuotaRetentionPolicy.BACKLOG_QUOTA_RETENTION_POLICY_PRODUCER_REQUEST_HOLD;
    case 'producer_exception':
      return pb.BacklogQuotaRetentionPolicy.BACKLOG_QUOTA_RETENTION_POLICY_PRODUCER_EXCEPTION;
    case 'consumer_backlog_eviction':
      return pb.BacklogQuotaRetentionPolicy.BACKLOG_QUOTA_RETENTION_POLICY_CONSUMER_BACKLOG_EVICTION;
  }
}

export default field;
