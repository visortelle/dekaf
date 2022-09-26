import Select from "../../../ui/Select/Select";
import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
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
import WithUpdateConfirmation from "../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation";
import { GetBacklogQuotasRequest } from "../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb";
import { Code } from "../../../../grpc-web/google/rpc/code_pb";
import { Duration } from "../../../ui/ConfigurationTable/DurationInput/types";

const policy = 'backlogQuota';

type BacklogQuotaPolicyType = 'consumer_backlog_eviction' | 'producer_request_hold' | 'producer_exception';
type PolicyValue = {
  destinationStorage: { type: 'inherited-from-broker-config' } | {
    type: 'specified-for-this-namespace';
    limit: { type: 'infinite' } | { type: 'specific', size: MemorySize };
    policy: BacklogQuotaPolicyType;
  },
  messageAge: { type: 'inherited-from-broker-config' } | {
    type: 'specified-for-this-namespace';
    limitTime: { type: 'infinite' } | { type: 'specific', duration: Duration };
    policy: BacklogQuotaPolicyType;
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

  const { data: backlogQuotas, error: backlogQuotasError } = useSWR(
    swrKey,
    async () => {
      const req = new GetBacklogQuotasRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);
      const res = await namespaceServiceClient.getBacklogQuotas(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Failed to get backlog quotas for namespace. ${res.getStatus()?.getMessage()}`);
      }

      let v: PolicyValue = { destinationStorage: { type: 'inherited-from-broker-config' }, messageAge: { type: 'inherited-from-broker-config' } };

      const destinationStorage = res.getDestinationStorage();
      if (destinationStorage !== undefined) {
        v.destinationStorage = {
          type: 'specified-for-this-namespace',
          limit: destinationStorage.getLimitSize() === -1 ? { type: 'infinite' } : { type: 'specific', size: bytesToMemorySize(destinationStorage.getLimitSize()) },
          policy: 'producer_request_hold'
        };
      }

      const messageAge = res.getMessageAge();
      if (messageAge !== undefined) {
        v.messageAge = {
          type: 'specified-for-this-namespace',
          limitTime: messageAge.getLimitTime() === -1 ? { type: 'infinite' } : { type: 'specific', duration: secondsToDuration(messageAge.getLimitTime()) },
          policy: 'producer_request_hold'
        };
      }
      return v;
    }
  );

  if (backlogQuotasError) {
    notifyError(`Unable to get backlog quota policy. ${backlogQuotasError}`);
  }

  if (backlogQuotas === undefined) {
    return null;
  }

  return (
    <WithUpdateConfirmation<PolicyValue>
      initialValue={backlogQuotas}
      onConfirm={() => mutate(swrKey)}
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
                      limit: v === 'infinite' ? { type: 'infinite' } : { type: 'specific', size: { size: 1, unit: 'KB' } },
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
                  value={value.destinationStorage.limit.size}
                  onChange={(v) => {
                    if (value.destinationStorage.type === 'inherited-from-broker-config') {
                      return;
                    }

                    onChange({
                      ...value,
                      destinationStorage: {
                        ...value.destinationStorage,
                        limit: { type: 'specific', size: v }
                      }
                    })
                  }}
                />
              </div>
            )}

            {value.destinationStorage.type === 'specified-for-this-namespace' && (
              <div className={sf.FormItem}>
                <div className={sf.FormLabel}>Policy</div>
                <Select<BacklogQuotaPolicyType>
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
                      limitTime: v === 'infinite' ? { type: 'infinite' } : { type: 'specific', duration: { value: 14, unit: 'd' } },
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
                  value={value.messageAge.limitTime.duration}
                  onChange={(v) => {
                    if (value.messageAge.type === 'inherited-from-broker-config') {
                      return;
                    }

                    onChange({
                      ...value,
                      messageAge: {
                        ...value.messageAge,
                        limitTime: { type: 'specific', duration: v }
                      }
                    })
                  }}
                />
              </div>
            )}

            {value.messageAge.type === 'specified-for-this-namespace' && (
              <div className={sf.FormItem}>
                <div className={sf.FormLabel}>Policy</div>
                <Select<BacklogQuotaPolicyType>
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

export default field;
