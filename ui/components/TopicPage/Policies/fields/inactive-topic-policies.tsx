import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import stringify from "safe-stable-stringify";

import Select from "../../../ui/Select/Select";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import sf from '../../../ui/ConfigurationTable/form.module.css';
import WithUpdateConfirmation from "../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation";
import DurationInput from "../../../ui/ConfigurationTable/DurationInput/DurationInput";
import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import { Code } from "../../../../grpc-web/google/rpc/code_pb";
import * as pb from "../../../../grpc-web/tools/teal/pulsar/ui/topicpolicies/v1/topicpolicies_pb";
import { swrKeys } from "../../../swrKeys";

const policy = 'inactiveTopicPolicies';

type InactiveTopicDeleteMode = 'delete_when_no_subscriptions' | 'delete_when_subscriptions_caught_up';

type PolicyValue = { type: 'inherited-from-namespace-config' } | {
  type: 'specified-for-this-topic',
  inactiveTopicDeleteMode: InactiveTopicDeleteMode,
  deleteWhileInactive: boolean,
  maxInactiveDurationSeconds: number;
}

export type FieldInputProps = {
  topicType: 'persistent' | 'non-persistent';
  tenant: string;
  namespace: string;
  topic: string;
  isGlobal: boolean;
}

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const { topicpoliciesServiceClient } = PulsarGrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();
  const [key, setKey] = useState(0);

  const swrKey = props.topicType === 'persistent' ?
    swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy, isGlobal: props.isGlobal }) :
    swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy, isGlobal: props.isGlobal });

  const { data: initialValue, error: initialValueError } = useSWR(
    swrKey,
    async () => {
      const req = new pb.GetInactiveTopicPoliciesRequest();
      req.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
      req.setIsGlobal(props.isGlobal);

      const res = await topicpoliciesServiceClient.getInactiveTopicPolicies(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get inactive topic policies: ${res.getStatus()?.getMessage()}`);
        return;
      }

      let initialValue: PolicyValue = { type: 'inherited-from-namespace-config' };
      switch (res.getInactiveTopicPoliciesCase()) {
        case pb.GetInactiveTopicPoliciesResponse.InactiveTopicPoliciesCase.UNSPECIFIED: {
          initialValue = { type: 'inherited-from-namespace-config' };
          break;
        }
        case pb.GetInactiveTopicPoliciesResponse.InactiveTopicPoliciesCase.SPECIFIED: {
          const inactiveTopicDeleteModeFromPb = (res: pb.GetInactiveTopicPoliciesResponse): InactiveTopicDeleteMode => {
            const mode = res.getSpecified()?.getInactiveTopicDeleteMode();
            switch (mode) {
              case pb.InactiveTopicPoliciesDeleteMode.INACTIVE_TOPIC_POLICIES_DELETE_MODE_DELETE_WHEN_NO_SUBSCRIPTIONS: return 'delete_when_no_subscriptions';
              case pb.InactiveTopicPoliciesDeleteMode.INACTIVE_TOPIC_POLICIES_DELETE_MODE_DELETE_WHEN_SUBSCRIPTIONS_CAUGHT_UP: return 'delete_when_subscriptions_caught_up';
              default: throw new Error(`Unknown inactive topic delete mode: ${mode}`);
            }
          }

          initialValue = {
            type: 'specified-for-this-topic',
            deleteWhileInactive: res.getSpecified()?.getDeleteWhileInactive() ?? false,
            inactiveTopicDeleteMode: inactiveTopicDeleteModeFromPb(res),
            maxInactiveDurationSeconds: res.getSpecified()?.getMaxInactiveDurationSeconds() ?? 0,
          }
        }
      }

      return initialValue;
    }
  );

  if (initialValueError) {
    notifyError(`Unable to get inactive topic policies. ${initialValueError}`);
  }

  if (initialValue === undefined) {
    return null;
  }

  const updatePolicy = async (value: PolicyValue) => {
    if (value.type === 'inherited-from-namespace-config') {
      const req = new pb.RemoveInactiveTopicPoliciesRequest();
      req.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
      req.setIsGlobal(props.isGlobal);

      const res = await topicpoliciesServiceClient.removeInactiveTopicPolicies(req, {});

      if (res !== undefined && (res.getStatus()?.getCode() !== Code.OK)) {
        notifyError(`Unable to set inactive topic policies: ${res.getStatus()?.getMessage()}`);
      }
    }

    if (value.type === 'specified-for-this-topic') {
      const inactiveTopicDeleteModeToPb = (mode: InactiveTopicDeleteMode): pb.InactiveTopicPoliciesDeleteMode => {
        switch (mode) {
          case 'delete_when_no_subscriptions': return pb.InactiveTopicPoliciesDeleteMode.INACTIVE_TOPIC_POLICIES_DELETE_MODE_DELETE_WHEN_NO_SUBSCRIPTIONS;
          case 'delete_when_subscriptions_caught_up': return pb.InactiveTopicPoliciesDeleteMode.INACTIVE_TOPIC_POLICIES_DELETE_MODE_DELETE_WHEN_SUBSCRIPTIONS_CAUGHT_UP;
          default: throw new Error(`Unknown inactive topic delete mode: ${mode}`);
        }
      }

      const req = new pb.SetInactiveTopicPoliciesRequest();
      req.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
      req.setIsGlobal(props.isGlobal);
      req.setInactiveTopicDeleteMode(inactiveTopicDeleteModeToPb(value.inactiveTopicDeleteMode));
      req.setMaxInactiveDurationSeconds(Math.floor(value.maxInactiveDurationSeconds));
      req.setDeleteWhileInactive(value.deleteWhileInactive);

      const res = await topicpoliciesServiceClient.setInactiveTopicPolicies(req, {});
      if (res !== undefined && (res.getStatus()?.getCode() !== Code.OK)) {
        notifyError(`Unable to set inactive topic policies: ${res.getStatus()?.getMessage()}`);
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
      key={stringify({ initialValue, key })}
      initialValue={initialValue}
      onConfirm={updatePolicy}
    >
      {({ value, onChange }) => {
        return (
          <>
            <div className={sf.FormItem}>
              <Select<PolicyValue['type']>
                list={[
                  { type: 'item', value: 'inherited-from-namespace-config', title: 'Inherited from namespace config' },
                  { type: 'item', value: 'specified-for-this-topic', title: 'Specified for this topic' }
                ]}
                onChange={(v) => {
                  if (v === 'inherited-from-namespace-config') {
                    onChange({ type: 'inherited-from-namespace-config' });
                  }
                  if (v === 'specified-for-this-topic') {
                    onChange({
                      type: 'specified-for-this-topic',
                      inactiveTopicDeleteMode: 'delete_when_no_subscriptions',
                      deleteWhileInactive: false,
                      maxInactiveDurationSeconds: 120
                    });
                  }
                }}
                value={value.type}
              />
            </div>
            {value.type === 'specified-for-this-topic' && (
              <div>
                <strong className={sf.FormLabel}>Delete while inactive</strong>
                <div className={sf.FormItem}>
                  <Select<'true' | 'false'>
                    list={[
                      { type: 'item', value: 'true', title: 'Enabled' },
                      { type: 'item', value: 'false', title: 'Disabled' }
                    ]}
                    onChange={(v) => onChange({ ...value, deleteWhileInactive: v === 'true' })}
                    value={value.deleteWhileInactive ? 'true' : 'false'}
                  />
                </div>

                <strong className={sf.FormLabel}>Delete mode</strong>
                <div className={sf.FormItem}>
                  <Select<InactiveTopicDeleteMode>
                    list={[
                      { type: 'item', value: 'delete_when_no_subscriptions', title: 'Delete when no subscriptions' },
                      { type: 'item', value: 'delete_when_subscriptions_caught_up', title: 'Delete when subscriptions caught up' }
                    ]}
                    onChange={(v) => onChange({ ...value, inactiveTopicDeleteMode: v })}
                    value={value.inactiveTopicDeleteMode}
                  />
                </div>

                <strong className={sf.FormLabel}>Max inactive duration</strong>
                <div className={sf.FormItem}>
                  <DurationInput
                    initialValue={value.maxInactiveDurationSeconds}
                    onChange={(v) => onChange({ ...value, maxInactiveDurationSeconds: v })}
                  />
                </div>
              </div>
            )}
          </>
        );
      }}
    </WithUpdateConfirmation>
  );
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Inactive topic policies',
  description: <span>Set the inactive policies on a topic.</span>,
  input: <FieldInput {...props} />
});

export default field;
