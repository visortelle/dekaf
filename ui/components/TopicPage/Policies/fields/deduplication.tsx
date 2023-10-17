import useSWR, { useSWRConfig } from "swr";
import stringify from 'safe-stable-stringify';

import WithUpdateConfirmation from "../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import Select from "../../../ui/Select/Select";
import * as Notifications from '../../../app/contexts/Notifications';
import * as GrpcClient from '../../../app/contexts/GrpcClient/GrpcClient';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/topic_policies/v1/topic_policies_pb';
import { Code } from "../../../../grpc-web/google/rpc/code_pb";
import { swrKeys } from "../../../swrKeys";
import TooltipElement from "../../../ui/Tooltip/TooltipElement/TooltipElement";
import {help} from "../../../ui/help";
import React from "react";
import { PulsarTopicPersistency } from "../../../pulsar/pulsar-resources";

const policy = 'deduplication';

export type FieldInputProps = {
  topicPersistency: PulsarTopicPersistency;
  tenant: string;
  namespace: string;
  topic: string;
  isGlobal: boolean;
}

type PolicyValue = 'inherited-from-namespace-config' | 'enabled' | 'disabled';

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const adminClient = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();

  const swrKey = props.topicPersistency === 'persistent' ? (
      props.isGlobal ?
        swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics.policies.globalPolicy({ tenant: props.tenant, namespace: props.namespace, policy }) :
        swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics.policies.localPolicy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy })
    ) : (
      props.isGlobal ?
        swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics.policies.globalPolicy({ tenant: props.tenant, namespace: props.namespace, policy }) :
        swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics.policies.localPolicy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy })
    );

  const { data: initialValue, error: initialValueError } = useSWR(
    swrKey,
    async () => {
      const req = new pb.GetDeduplicationRequest();
      req.setTopic(`${props.topicPersistency}://${props.tenant}/${props.namespace}/${props.topic}`);
      req.setIsGlobal(props.isGlobal);

      const res = await adminClient.topicPoliciesServiceClient.getDeduplication(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get deduplication policy. ${res.getStatus()?.getMessage()}`);
        return;
      }

      let initialValue: PolicyValue = 'inherited-from-namespace-config';
      switch (res.getDeduplicationCase()) {
        case pb.GetDeduplicationResponse.DeduplicationCase.UNSPECIFIED: initialValue = 'inherited-from-namespace-config'; break;
        case pb.GetDeduplicationResponse.DeduplicationCase.SPECIFIED: {
          initialValue = res.getSpecified()?.getEnabled() ? 'enabled' : 'disabled';
          break;
        }
      }

      return initialValue;
    }
  );

  if (initialValueError) {
    notifyError(`Unable to get deduplication: ${initialValueError}`);
  }

  if (initialValue === undefined) {
    return null;
  }

  return (
    <WithUpdateConfirmation<PolicyValue>
      key={stringify(initialValue)}
      initialValue={initialValue}
      onConfirm={async (v) => {
        if (v === 'inherited-from-namespace-config') {
          const req = new pb.RemoveDeduplicationRequest();
          req.setTopic(`${props.topicPersistency}://${props.tenant}/${props.namespace}/${props.topic}`);
          req.setIsGlobal(props.isGlobal);

          const res = await adminClient.topicPoliciesServiceClient.removeDeduplication(req, {});

          if (res?.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set deduplication policy. ${res?.getStatus()?.getMessage()}`);
          }
        }

        if (v === 'enabled' || v === 'disabled') {
          const req = new pb.SetDeduplicationRequest();
          req.setTopic(`${props.topicPersistency}://${props.tenant}/${props.namespace}/${props.topic}`);
          req.setIsGlobal(props.isGlobal);
          req.setEnabled(v === 'enabled');

          const res = await adminClient.topicPoliciesServiceClient.setDeduplication(req, {})
          if (res?.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set deduplication policy. ${res?.getStatus()?.getMessage()}`);
          }
        }

        setTimeout(async () => {
          await mutate(swrKey);
        }, 300);
      }}
    >
      {({ value, onChange }) => {
        return (
          <Select<PolicyValue>
            list={[
              { type: 'item', value: 'inherited-from-namespace-config', title: 'Inherited from namespace config' },
              { type: 'item', value: 'enabled', title: 'Enabled' },
              { type: 'item', value: 'disabled', title: 'Disabled' },
            ]}
            value={value}
            onChange={(v) => onChange(v)}
          />
        );
      }}
    </WithUpdateConfirmation>
  );
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Deduplication',
  description: <span>Enables or disable <TooltipElement tooltipHelp={help["deduplication"]} link="https://pulsar.apache.org/docs/3.0.x/cookbooks-deduplication/">deduplication</TooltipElement> for the topic.</span>,
  input: <FieldInput {...props} />
});

export default field;
