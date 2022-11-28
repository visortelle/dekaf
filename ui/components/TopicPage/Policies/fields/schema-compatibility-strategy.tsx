import React from 'react';
import stringify from "safe-stable-stringify";

import Select from "../../../ui/Select/Select";
import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import { swrKeys } from "../../../swrKeys";
import * as pb from "../../../../grpc-web/tools/teal/pulsar/ui/topicpolicies/v1/topicpolicies_pb";
import { Code } from "../../../../grpc-web/google/rpc/code_pb";
import WithUpdateConfirmation from "../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation";

const policy = 'schemaCompatibilityStrategy';

export type FieldInputProps = {
  topicType: 'persistent' | 'non-persistent';
  tenant: string;
  namespace: string;
  topic: string;
  isGlobal: boolean;
}

type PolicyValue = keyof typeof pb.SchemaCompatibilityStrategy;
const strategies = (Object.keys(pb.SchemaCompatibilityStrategy) as PolicyValue[])
  .filter(key => key !== 'SCHEMA_COMPATIBILITY_STRATEGY_UNSPECIFIED')
  .sort((a, b) => a.localeCompare(b));

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const { topicpoliciesServiceClient } = PulsarGrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();

  const onUpdateError = (err: string) => notifyError(`Can't update schema compatibility strategy. ${err}`);
  const swrKey = props.topicType === 'persistent' ?
    swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy, isGlobal: props.isGlobal }) :
    swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy, isGlobal: props.isGlobal });

  const { data: initialValue, error: initialValueError } = useSWR(
    swrKey,
    async () => {
      const req = new pb.GetSchemaCompatibilityStrategyRequest();
      req.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
      req.setIsGlobal(props.isGlobal);
      const res = await topicpoliciesServiceClient.getSchemaCompatibilityStrategy(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Can't get schema compatibility strategy. ${res.getStatus()?.getMessage()}`);
        return undefined;
      }
      return (Object.entries(pb.SchemaCompatibilityStrategy).find(([_, i]) => i === res.getStrategy()) || [])[0] as PolicyValue;
    },
  );

  if (initialValueError) {
    notifyError(`Can't get schema compatibility strategy: ${initialValueError}`);
  }

  if (initialValue === undefined) {
    return null;
  }

  return (
    <WithUpdateConfirmation<PolicyValue>
      initialValue={initialValue}
      key={stringify(initialValue)}
      onConfirm={async (v) => {
        const req = new pb.SetSchemaCompatibilityStrategyRequest();
        req.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
        req.setIsGlobal(props.isGlobal);
        req.setStrategy(pb.SchemaCompatibilityStrategy[v]);
        const res = await topicpoliciesServiceClient.setSchemaCompatibilityStrategy(req, {}).catch(onUpdateError);

        if (res === undefined) {
          return;
        }
        if (res.getStatus()?.getCode() !== Code.OK) {
          notifyError(`Can't update schema compatibility strategy. ${res.getStatus()?.getMessage()}`);
        }

        setTimeout(async () => {
          await mutate(swrKey);
        }, 300);
      }}
    >
      {({ value, onChange }) => {
        return (
          <Select<PolicyValue>
            list={strategies.map(s => ({ type: 'item', value: s, title: s.replace('SCHEMA_COMPATIBILITY_STRATEGY_', '') }))}
            value={value}
            onChange={onChange}
          />
        );
      }}
    </WithUpdateConfirmation>

  );
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Schema compatibility strategy',
  description: <span>Compatibility level required for new schemas created via a Producer.</span>,
  input: <FieldInput {...props} />
});

export default field;
