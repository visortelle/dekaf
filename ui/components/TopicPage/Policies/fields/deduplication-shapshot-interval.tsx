import useSWR, { useSWRConfig } from "swr";
import stringify from 'safe-stable-stringify';

import * as Notifications from '../../../app/contexts/Notifications';
import * as GrpcClient from '../../../app/contexts/GrpcClient/GrpcClient';
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import sf from '../../../ui/ConfigurationTable/form.module.css';
import Select from '../../../ui/Select/Select';
import DurationInput from '../../../ui/ConfigurationTable/DurationInput/DurationInput';
import WithUpdateConfirmation from '../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/topicpolicies/v1/topicpolicies_pb';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import { swrKeys } from '../../../swrKeys';
import TooltipElement from "../../../ui/Tooltip/TooltipElement/TooltipElement";
import {help} from "../../../ui/help";
import React from "react";
import { PulsarTopicPersistency } from "../../../pulsar/pulsar-resources";


const policy = 'deduplicationSnapshotInterval';

type PolicyValue = { type: 'inherited-from-namespace-config' } | {
  type: 'specified-for-this-topic',
  intervalSeconds: number;
};

export type FieldInputProps = {
  topicPersistency: PulsarTopicPersistency;
  tenant: string;
  namespace: string;
  topic: string;
  isGlobal: boolean;
}

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const { topicPoliciesServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig()

  const swrKey = props.topicPersistency === 'persistent' ?
    swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy, isGlobal: props.isGlobal }) :
    swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy, isGlobal: props.isGlobal });

  const { data: initialValue, error: initialValueError } = useSWR(
    swrKey,
    async () => {
      const req = new pb.GetDeduplicationSnapshotIntervalRequest();
      req.setTopic(`${props.topicPersistency}://${props.tenant}/${props.namespace}/${props.topic}`);
      req.setIsGlobal(props.isGlobal);

      const res = await topicPoliciesServiceClient.getDeduplicationSnapshotInterval(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get deduplication snapshot interval: ${res.getStatus()?.getMessage()}`);
      }

      let value: PolicyValue = { type: 'inherited-from-namespace-config' };
      switch (res.getIntervalCase()) {
        case pb.GetDeduplicationSnapshotIntervalResponse.IntervalCase.DISABLED: {
          value = { type: 'inherited-from-namespace-config' };
          break;
        }
        case pb.GetDeduplicationSnapshotIntervalResponse.IntervalCase.ENABLED: {
          value = { type: 'specified-for-this-topic', intervalSeconds: res.getEnabled()?.getInterval() || 0 };
        }
      }

      return value;
    }
  );

  if (initialValueError) {
    notifyError(`Unable to get deduplication snapshot interval: ${initialValueError}`);
  }

  if (initialValue === undefined) {
    return null;
  }


  return (
    <WithUpdateConfirmation<PolicyValue>
      key={stringify(initialValue)}
      initialValue={initialValue}
      onConfirm={async (value) => {
        if (value.type === 'inherited-from-namespace-config') {
          const req = new pb.RemoveDeduplicationSnapshotIntervalRequest();
          req.setTopic(`${props.topicPersistency}://${props.tenant}/${props.namespace}/${props.topic}`);
          req.setIsGlobal(props.isGlobal);
          const res = await topicPoliciesServiceClient.removeDeduplicationSnapshotInterval(req, {});
          if (res !== undefined && res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set deduplication snapshot interval: ${res.getStatus()?.getMessage()}`);
          }
        }

        if (value.type === 'specified-for-this-topic') {
          const maxInt32 = 2_147_483_647;
          if (value.intervalSeconds > maxInt32) {
            notifyError(`Unable to set deduplication snapshot interval. It should be less than ${new Intl.NumberFormat('en-US').format(maxInt32)} seconds`);
            return;
          }

          const req = new pb.SetDeduplicationSnapshotIntervalRequest();
          req.setTopic(`${props.topicPersistency}://${props.tenant}/${props.namespace}/${props.topic}`);
          req.setIsGlobal(props.isGlobal);
          req.setInterval(Math.floor(value.intervalSeconds));
          const res = await topicPoliciesServiceClient.setDeduplicationSnapshotInterval(req, {});
          if (res !== undefined && res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set deduplication snapshot interval: ${res.getStatus()?.getMessage()}`);
          }
        }

        setTimeout(async () => {
          await mutate(swrKey);
        }, 300);
      }}
    >
      {({ value, onChange }) => {
        return (
          <>
            <div className={sf.FormItem}>
              <Select<PolicyValue['type']>
                value={value.type}
                onChange={(type) => onChange(type === 'inherited-from-namespace-config' ? { type: 'inherited-from-namespace-config' } : { type: 'specified-for-this-topic', intervalSeconds: 0 })}
                list={[
                  { type: 'item', value: 'inherited-from-namespace-config', title: 'Inherited from namespace config' },
                  { type: 'item', value: 'specified-for-this-topic', title: 'Specified for this topic' }
                ]}
              />
            </div>
            {value.type === 'specified-for-this-topic' && (
              <DurationInput
                initialValue={value.intervalSeconds}
                onChange={(duration) => onChange({ ...value, intervalSeconds: duration })}
              />
            )}
          </>
        );
      }}
    </WithUpdateConfirmation >
  )
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Deduplication snapshot interval',
  description: <span><TooltipElement tooltipHelp={help["deduplicationSnapshot"]}>Deduplication snapshot</TooltipElement> interval. <code>namespaceDeduplicationEnabled</code> must be set to true for this property to take effect.</span>,
  input: <FieldInput {...props} />
});

export default field;
