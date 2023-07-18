import useSWR, { useSWRConfig } from "swr";
import stringify from "safe-stable-stringify";

import * as Notifications from '../../../app/contexts/Notifications';
import * as GrpcClient from '../../../app/contexts/GrpcClient/GrpcClient';
import Select from "../../../ui/Select/Select";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import sf from '../../../ui/ConfigurationTable/form.module.css';
import MemorySizeInput from "../../../ui/ConfigurationTable/MemorySizeInput/MemorySizeInput";
import DurationInput from "../../../ui/ConfigurationTable/DurationInput/DurationInput";
import WithUpdateConfirmation from "../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation";
import { swrKeys } from "../../../swrKeys";
import * as pb from "../../../../grpc-web/tools/teal/pulsar/ui/topicpolicies/v1/topicpolicies_pb";
import { Code } from "../../../../grpc-web/google/rpc/code_pb";

import s from './backlog-quota.module.css';
import { useState } from "react";

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
  destinationStorage: { type: 'inherited-from-namespace-config' } | {
    type: 'specified-for-this-topic';
    limit: { type: 'infinite' } | { type: 'specific', sizeBytes: number };
    policy: RetentionPolicy;
  },
  messageAge: { type: 'inherited-from-namespace-config' } | {
    type: 'specified-for-this-topic';
    limitTime: { type: 'infinite' } | { type: 'specific', durationSeconds: number };
    policy: RetentionPolicy;
  }
}

export type FieldInputProps = {
  topicType: 'persistent' | 'non-persistent';
  tenant: string;
  namespace: string;
  topic: string;
  isGlobal: boolean;
}

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const { topicPoliciesServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();
  const [key, setKey] = useState(0);

  const swrKey = props.topicType === 'persistent' ?
    swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy, isGlobal: props.isGlobal }) :
    swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy, isGlobal: props.isGlobal });

  const { data: initialValue, error: initialValueError } = useSWR(
    swrKey,
    async () => {
      const req = new pb.GetBacklogQuotasRequest();
      req.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
      req.setIsGlobal(props.isGlobal);

      const res = await topicPoliciesServiceClient.getBacklogQuotas(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get backlog quotas for topic. ${res.getStatus()?.getMessage()}`);
      }

      let v: PolicyValue = {
        destinationStorage: { type: 'inherited-from-namespace-config' },
        messageAge: { type: 'inherited-from-namespace-config' },
      };

      const destinationStorage = res.getDestinationStorage();
      if (destinationStorage !== undefined) {
        v.destinationStorage = {
          type: 'specified-for-this-topic',
          limit: destinationStorage.getLimitSize() === -1 ? { type: 'infinite' } : { type: 'specific', sizeBytes: destinationStorage.getLimitSize() },
          policy: retentionPolicyFromPb(destinationStorage.getRetentionPolicy())
        };
      }
      const messageAge = res.getMessageAge();
      if (messageAge !== undefined) {
        v.messageAge = {
          type: 'specified-for-this-topic',
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
    req.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
    req.setIsGlobal(props.isGlobal)
    let destinationStorageBacklogQuotaPb: pb.DestinationStorageBacklogQuota | undefined = undefined;

    if (v.destinationStorage.type === 'specified-for-this-topic') {
      destinationStorageBacklogQuotaPb = new pb.DestinationStorageBacklogQuota();
      destinationStorageBacklogQuotaPb.setLimitSize(v.destinationStorage.limit.type === 'infinite' ? -1 : Math.floor(v.destinationStorage.limit.sizeBytes));
      destinationStorageBacklogQuotaPb.setRetentionPolicy(retentionPolicyToPb(v.destinationStorage.policy));
    }

    req.setDestinationStorage(destinationStorageBacklogQuotaPb)
    let messageAgeBacklogQuotaPb: pb.MessageAgeBacklogQuota | undefined = undefined;

    if (v.messageAge.type === 'specified-for-this-topic') {
      messageAgeBacklogQuotaPb = new pb.MessageAgeBacklogQuota();
      messageAgeBacklogQuotaPb.setLimitTime(v.messageAge.limitTime.type === 'infinite' ? -1 : Math.floor(v.messageAge.limitTime.durationSeconds));
      messageAgeBacklogQuotaPb.setRetentionPolicy(retentionPolicyToPb(v.messageAge.policy));
    }

    req.setMessageAge(messageAgeBacklogQuotaPb)
    const res = await topicPoliciesServiceClient.setBacklogQuotas(req, {}).catch(err => notifyError(`Unable to update backlog quota policy. ${err}`));

    if (res !== undefined && res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to update backlog quota policy. ${res.getStatus()?.getMessage()}`);
    }

    if (v.destinationStorage.type === 'inherited-from-namespace-config') {
      const req = new pb.RemoveBacklogQuotaRequest();
      req.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
      req.setIsGlobal(props.isGlobal)
      req.setBacklogQuotaType(pb.BacklogQuotaType.BACKLOG_QUOTA_TYPE_DESTINATION_STORAGE);
      const res = await topicPoliciesServiceClient.removeBacklogQuota(req, {}).catch(err => notifyError(`Unable to remove backlog quota policy. ${err}`));
      if (res !== undefined && res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to remove backlog quota policy. ${res.getStatus()?.getMessage()}`);
      }
    }

    if (v.messageAge.type === 'inherited-from-namespace-config') {
      const req = new pb.RemoveBacklogQuotaRequest();
      req.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
      req.setIsGlobal(props.isGlobal)
      req.setBacklogQuotaType(pb.BacklogQuotaType.BACKLOG_QUOTA_TYPE_MESSAGE_AGE);
      const res = await topicPoliciesServiceClient.removeBacklogQuota(req, {}).catch(err => notifyError(`Unable to remove backlog quota policy. ${err}`));
      if (res !== undefined && res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to remove backlog quota policy. ${res.getStatus()?.getMessage()}`);
      }
    }

    // XXX Fix outdated input state after first update of any topic's policy in a new namespace.
    setTimeout(async () => {
      await mutate(swrKey);
      setKey(key + 1);
    }, 300);
  }

  return (
    <WithUpdateConfirmation<PolicyValue>
      key={key}
      initialValue={initialValue}
      onConfirm={updatePolicy}
    >
      {({ value, onChange }) => (
        <>
          <div className={s.Quota}>
            <div className={sf.FormLabel}>Destination storage</div>
            <div className={sf.FormItem}>
              <Select<'inherited-from-namespace-config' | 'specified-for-this-topic'>
                list={[
                  { type: 'item', value: 'inherited-from-namespace-config', title: 'Inherited from namespace config' },
                  { type: 'item', value: 'specified-for-this-topic', title: 'Specified for this topic' }
                ]}
                onChange={(v) => onChange({
                  ...value,
                  destinationStorage: v === 'inherited-from-namespace-config' ? { type: 'inherited-from-namespace-config' } : { type: 'specified-for-this-topic', limit: { type: 'infinite' }, policy: 'producer_request_hold' }
                })}
                value={value.destinationStorage.type}
              />
            </div>

            {value.destinationStorage.type === 'specified-for-this-topic' && (
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
                      type: 'specified-for-this-topic',
                      limit: v === 'infinite' ? { type: 'infinite' } : { type: 'specific', sizeBytes: 1024 },
                      policy: 'producer_request_hold'
                    }
                  })}
                  value={value.destinationStorage.limit.type}
                />
              </div>
            )}

            {value.destinationStorage.type === 'specified-for-this-topic' && value.destinationStorage.limit.type === 'specific' && (
              <div className={sf.FormItem}>
                <MemorySizeInput
                  initialValue={value.destinationStorage.limit.sizeBytes}
                  onChange={(v) => {
                    if (value.destinationStorage.type === 'inherited-from-namespace-config') {
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

            {value.destinationStorage.type === 'specified-for-this-topic' && (
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
                    if (value.destinationStorage.type === 'inherited-from-namespace-config') {
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
              <Select<'inherited-from-namespace-config' | 'specified-for-this-topic'>
                list={[
                  { type: 'item', value: 'inherited-from-namespace-config', title: 'Inherited from namespace config' },
                  { type: 'item', value: 'specified-for-this-topic', title: 'Specified for this topic' }
                ]}
                onChange={(v) => onChange({
                  ...value,
                  messageAge: v === 'inherited-from-namespace-config' ? { type: 'inherited-from-namespace-config' } : { type: 'specified-for-this-topic', limitTime: { type: 'infinite' }, policy: 'producer_request_hold' }
                })}
                value={value.messageAge.type}
              />
            </div>

            {value.messageAge.type === 'specified-for-this-topic' && (
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
                      type: 'specified-for-this-topic',
                      limitTime: v === 'infinite' ? { type: 'infinite' } : { type: 'specific', durationSeconds: 14 * 24 * 60 * 60 },
                      policy: 'producer_request_hold'
                    }
                  })}
                  value={value.messageAge.limitTime.type}
                />
              </div>
            )}

            {value.messageAge.type === 'specified-for-this-topic' && value.messageAge.limitTime.type === 'specific' && (
              <div className={sf.FormItem}>
                <DurationInput
                  initialValue={value.messageAge.limitTime.durationSeconds}
                  onChange={(v) => {
                    if (value.messageAge.type === 'inherited-from-namespace-config') {
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

            {value.messageAge.type === 'specified-for-this-topic' && (
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
                    if (value.messageAge.type === 'inherited-from-namespace-config') {
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
