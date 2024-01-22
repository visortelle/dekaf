import React from 'react';
import useSWR, { useSWRConfig } from "swr";
import stringify from "safe-stable-stringify";

import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import Select from "../../../ui/Select/Select";
import WithUpdateConfirmation from "../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation";
import * as Notifications from '../../../app/contexts/Notifications';
import * as GrpcClient from '../../../app/contexts/GrpcClient/GrpcClient';
import * as pb from "../../../../grpc-web/tools/teal/pulsar/ui/topicpolicies/v1/topicpolicies_pb";
import { Code } from "../../../../grpc-web/google/rpc/code_pb";
import { swrKeys } from "../../../swrKeys";

import sf from '../../../ui/ConfigurationTable/form.module.css';
import A from "../../../ui/A/A";
import { PulsarTopicPersistency } from '../../../pulsar/pulsar-resources';

const policy = 'schemaCompatibilityStrategy';

type Strategies = keyof typeof pb.SchemaCompatibilityStrategy;

type PolicyValue =
  { type: 'inherited-from-namespace-config' } |
  { type: 'specified-for-this-topic', schemaCompatibilityStrategy: Strategies };

export type FieldInputProps = {
  topicPersistency: PulsarTopicPersistency;
  tenant: string;
  namespace: string;
  topic: string;
  isGlobal: boolean;
}

const strategies = (Object.keys(pb.SchemaCompatibilityStrategy) as Strategies[])
  .filter(key => key !== 'SCHEMA_COMPATIBILITY_STRATEGY_UNSPECIFIED')
  .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const { topicPoliciesServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();

  const swrKey = props.topicPersistency === 'persistent' ?
    swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy, isGlobal: props.isGlobal }) :
    swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy, isGlobal: props.isGlobal });

  const { data: initialValue, error: initialValueError } = useSWR(
    swrKey,
    async () => {
      const req = new pb.GetSchemaCompatibilityStrategyRequest();
      req.setTopic(`${props.topicPersistency}://${props.tenant}/${props.namespace}/${props.topic}`);
      req.setIsGlobal(props.isGlobal);
      const res = await topicPoliciesServiceClient.getSchemaCompatibilityStrategy(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Can't get schema compatibility strategy. ${res.getStatus()?.getMessage()}`);
        return undefined;
      }
      let initialValue: PolicyValue = { type: 'inherited-from-namespace-config' };
      switch (res.getStrategyCase()) {
        case pb.GetSchemaCompatibilityStrategyResponse.StrategyCase.INHERITED: {
          initialValue = { type: 'inherited-from-namespace-config' };
          break;
        }
        case pb.GetSchemaCompatibilityStrategyResponse.StrategyCase.SPECIFIED: {
          initialValue = {
            type: 'specified-for-this-topic',
            schemaCompatibilityStrategy: (Object.entries(pb.SchemaCompatibilityStrategy).find(([_, i]) => i === res.getSpecified()?.getStrategy()) || [])[0] as Strategies,
          }
          break;
        }
      }

      return initialValue;
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
      key={stringify(initialValue)}
      initialValue={initialValue}
      onConfirm={async (value) => {
        if (value.type === 'inherited-from-namespace-config') {
          const req = new pb.SetSchemaCompatibilityStrategyRequest();
          req.setTopic(`${props.topicPersistency}://${props.tenant}/${props.namespace}/${props.topic}`);
          req.setIsGlobal(props.isGlobal);

          const res = await topicPoliciesServiceClient.removeSchemaCompatibilityStrategy(req, {});
          if (res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set schema compatibility strategy. ${res.getStatus()?.getMessage()}`);
            return;
          }
        }

        if (value.type === 'specified-for-this-topic') {
          const req = new pb.SetSchemaCompatibilityStrategyRequest();
          req.setTopic(`${props.topicPersistency}://${props.tenant}/${props.namespace}/${props.topic}`);
          req.setIsGlobal(props.isGlobal);
          req.setStrategy(pb.SchemaCompatibilityStrategy[value.schemaCompatibilityStrategy]);

          const res = await topicPoliciesServiceClient.setSchemaCompatibilityStrategy(req, {});
          if (res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set subscription types enabled. ${res.getStatus()?.getMessage()}`);
            return;
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
                list={[
                  { type: 'item', value: 'inherited-from-namespace-config', title: 'Inherited from namespace config' },
                  { type: 'item', value: 'specified-for-this-topic', title: 'Specified for this topic' }
                ]}
                onChange={v => {
                  switch (v) {
                    case 'inherited-from-namespace-config':
                      onChange({ type: 'inherited-from-namespace-config' });
                      break;
                    case 'specified-for-this-topic':
                      onChange({
                        type: 'specified-for-this-topic',
                        schemaCompatibilityStrategy: strategies[0]
                      });
                      break;
                  }
                }}
                value={value.type}
              />
            </div>
            {value.type === 'specified-for-this-topic' &&
              <div className={sf.FormItem}>
                <Select<Strategies>
                  list={strategies.map(s => ({ type: 'item', value: s, title: s.replace('SCHEMA_COMPATIBILITY_STRATEGY_', '') }))}
                  value={value.schemaCompatibilityStrategy}
                  onChange={(value) => onChange({
                    type: 'specified-for-this-topic',
                    schemaCompatibilityStrategy: value
                  })}
                />
              </div>
            }
          </>
        );
      }}
    </WithUpdateConfirmation>
  );
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Schema compatibility strategy',
  description:
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12rem' }}>
      The purpose of schema compatibility check is to ensure that existing consumers can process the introduced messages.
      <A isExternalLink href="https://pulsar.apache.org/docs/next/schema-understand/#schema-compatibility-check">Learn more</A>
    </div>,
  input: <FieldInput {...props} />
});

export default field;
