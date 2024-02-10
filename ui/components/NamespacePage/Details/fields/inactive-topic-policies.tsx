import Select from "../../../ui/Select/Select";
import * as Notifications from '../../../app/contexts/Notifications';
import * as GrpcClient from '../../../app/contexts/GrpcClient/GrpcClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import sf from '../../../ui/ConfigurationTable/form.module.css';
import DurationInput from "../../../ui/ConfigurationTable/DurationInput/DurationInput";
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/namespace_policies/v1/namespace_policies_pb';
import { swrKeys } from "../../../swrKeys";
import WithUpdateConfirmation from "../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation";
import { Code } from "../../../../grpc-web/google/rpc/code_pb";
import React, { useState } from "react";

const policy = 'inactiveTopicPolicies';

type InactiveTopicDeleteMode = 'delete_when_no_subscriptions' | 'delete_when_subscriptions_caught_up';

type PolicyValue = { type: 'inherited-from-broker-config' } | {
  type: 'specified-for-this-namespace',
  inactiveTopicDeleteMode: InactiveTopicDeleteMode,
  deleteWhileInactive: boolean,
  maxInactiveDurationSeconds: number;
}

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const { namespacePoliciesServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();
  const [key, setKey] = useState(0);

  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: initialValue, error: initialValueError } = useSWR(
    swrKey,
    async () => {
      const req = new pb.GetInactiveTopicPoliciesRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);

      const res = await namespacePoliciesServiceClient.getInactiveTopicPolicies(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get inactive topic policies: ${res.getStatus()?.getMessage()}`);
        return;
      }

      let initialValue: PolicyValue = { type: 'inherited-from-broker-config' };
      switch (res.getInactiveTopicPoliciesCase()) {
        case pb.GetInactiveTopicPoliciesResponse.InactiveTopicPoliciesCase.UNSPECIFIED: {
          initialValue = { type: 'inherited-from-broker-config' };
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
            type: 'specified-for-this-namespace',
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

  return (
    <WithUpdateConfirmation<PolicyValue>
      key={key}
      initialValue={initialValue}
      onConfirm={async (value) => {
        if (value.type === 'inherited-from-broker-config') {
          const req = new pb.RemoveInactiveTopicPoliciesRequest();
          req.setNamespace(`${props.tenant}/${props.namespace}`);

          const res = await namespacePoliciesServiceClient.removeInactiveTopicPolicies(req, {}).catch(err => notifyError(`Unable to set inactive topic policies: ${err}`));

          if (res !== undefined && (res.getStatus()?.getCode() !== Code.OK)) {
            notifyError(`Unable to set inactive topic policies: ${res.getStatus()?.getMessage()}`);
          }
        }

        if (value.type === 'specified-for-this-namespace') {
          const inactiveTopicDeleteModeToPb = (mode: InactiveTopicDeleteMode): pb.InactiveTopicPoliciesDeleteMode => {
            switch (mode) {
              case 'delete_when_no_subscriptions': return pb.InactiveTopicPoliciesDeleteMode.INACTIVE_TOPIC_POLICIES_DELETE_MODE_DELETE_WHEN_NO_SUBSCRIPTIONS;
              case 'delete_when_subscriptions_caught_up': return pb.InactiveTopicPoliciesDeleteMode.INACTIVE_TOPIC_POLICIES_DELETE_MODE_DELETE_WHEN_SUBSCRIPTIONS_CAUGHT_UP;
              default: throw new Error(`Unknown inactive topic delete mode: ${mode}`);
            }
          }

          const req = new pb.SetInactiveTopicPoliciesRequest();
          req.setNamespace(`${props.tenant}/${props.namespace}`);
          req.setInactiveTopicDeleteMode(inactiveTopicDeleteModeToPb(value.inactiveTopicDeleteMode));
          req.setMaxInactiveDurationSeconds(Math.floor(value.maxInactiveDurationSeconds));
          req.setDeleteWhileInactive(value.deleteWhileInactive);

          const res = await namespacePoliciesServiceClient.setInactiveTopicPolicies(req, {}).catch(err => notifyError(`Unable to set inactive topic policies: ${err}`));
          if (res !== undefined && (res.getStatus()?.getCode() !== Code.OK)) {
            notifyError(`Unable to set inactive topic policies: ${res.getStatus()?.getMessage()}`);
          }
        }

        await mutate(swrKey);
        setKey(key + 1);
      }}
    >
      {({ value, onChange }) => {
        return (
          <>
            <div className={sf.FormItem}>
              <Select<PolicyValue['type']>
                list={[
                  { type: 'item', value: 'inherited-from-broker-config', title: 'Inherited from broker config' },
                  { type: 'item', value: 'specified-for-this-namespace', title: 'Specified for this namespace' }
                ]}
                onChange={(v) => {
                  if (v === 'inherited-from-broker-config') {
                    onChange({ type: 'inherited-from-broker-config' });
                  }
                  if (v === 'specified-for-this-namespace') {
                    onChange({ type: 'specified-for-this-namespace', inactiveTopicDeleteMode: 'delete_when_no_subscriptions', deleteWhileInactive: false, maxInactiveDurationSeconds: 120 });
                  }
                }}
                value={value.type}
              />
            </div>
            {value.type === 'specified-for-this-namespace' && (
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

                {value.deleteWhileInactive && (
                  <>
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
                  </>)}
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
  description: <span>Specifies if and when inactive topics should be deleted. Inactive topic is a topic that had no active producers or consumers for specified umount of time.</span>,
  input: <FieldInput {...props} />
});

export default field;
