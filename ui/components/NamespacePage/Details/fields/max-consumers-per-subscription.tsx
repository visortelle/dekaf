import * as Notifications from '../../../app/contexts/Notifications';
import * as GrpcClient from '../../../app/contexts/GrpcClient/GrpcClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import Input from '../../../ui/Input/Input';
import Select from '../../../ui/Select/Select';
import sf from '../../../ui/ConfigurationTable/form.module.css';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/namespace_policies/v1/namespace_policies_pb';
import { swrKeys } from '../../../swrKeys';
import WithUpdateConfirmation from '../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import React from "react";

const policy = 'maxConsumersPerSubscription';

type PolicyValue = { type: 'inherited-from-broker-config' } |
{ type: 'unlimited' } | {
  type: 'specified-for-this-namespace',
  maxConsumersPerSubscription: number,
};

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const { namespacePoliciesServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();

  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: initialValue, error: initialValueError } = useSWR(
    swrKey,
    async () => {
      const req = new pb.GetMaxConsumersPerSubscriptionRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);

      const res = await namespacePoliciesServiceClient.getMaxConsumersPerSubscription(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get max consumers per subscriptions: ${res.getStatus()?.getMessage()}`);
        return;
      }

      let initialValue: PolicyValue = { type: 'inherited-from-broker-config' };
      switch (res.getMaxConsumersPerSubscriptionCase()) {
        case pb.GetMaxConsumersPerSubscriptionResponse.MaxConsumersPerSubscriptionCase.UNSPECIFIED: {
          initialValue = { type: 'inherited-from-broker-config' };
          break;
        }
        case pb.GetMaxConsumersPerSubscriptionResponse.MaxConsumersPerSubscriptionCase.SPECIFIED: {
          const maxConsumersPerSubscription = res.getSpecified()?.getMaxConsumersPerSubscription() ?? 0;

          if (maxConsumersPerSubscription === 0) {
            initialValue = { type: 'unlimited' };
          } else {
            initialValue = { type: 'specified-for-this-namespace', maxConsumersPerSubscription };
          }

          break;
        }
      }

      return initialValue;
    }
  );

  if (initialValueError) {
    notifyError(`Unable to get max consumers per subscription. ${initialValueError}`);
  }

  if (initialValue === undefined) {
    return null;
  }

  return (
    <WithUpdateConfirmation<PolicyValue>
      initialValue={initialValue}
      onConfirm={async (value) => {
        if (value.type === 'inherited-from-broker-config') {
          const req = new pb.RemoveMaxConsumersPerSubscriptionRequest();
          req.setNamespace(`${props.tenant}/${props.namespace}`);

          const res = await namespacePoliciesServiceClient.removeMaxConsumersPerSubscription(req, {});
          if (res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set max subscriptions per topic: ${res.getStatus()?.getMessage()}`);
          }
        }

        if (value.type === 'unlimited' || value.type === 'specified-for-this-namespace') {
          const req = new pb.SetMaxConsumersPerSubscriptionRequest();
          req.setNamespace(`${props.tenant}/${props.namespace}`);

          if (value.type === 'unlimited') {
            req.setMaxConsumersPerSubscription(0);
          }

          if (value.type === 'specified-for-this-namespace') {
            req.setMaxConsumersPerSubscription(value.maxConsumersPerSubscription);
          }

          const res = await namespacePoliciesServiceClient.setMaxConsumersPerSubscription(req, {});
          if (res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set max subscriptions per topic: ${res.getStatus()?.getMessage()}`);
          }
        }

        mutate(swrKey);
      }}
    >
      {({ value, onChange }) => {
        return (
          <>
            <div className={sf.FormItem}>
              <Select<PolicyValue['type']>
                list={[
                  { type: 'item', value: 'inherited-from-broker-config', title: 'Inherited from broker config' },
                  { type: 'item', value: 'unlimited', title: 'Unlimited' },
                  { type: 'item', value: 'specified-for-this-namespace', title: 'Specified for this namespace' },
                ]}
                onChange={(v) => {
                  switch (v) {
                    case 'inherited-from-broker-config': onChange({ type: 'inherited-from-broker-config' }); break;
                    case 'unlimited': onChange({ type: 'unlimited' }); break;
                    case 'specified-for-this-namespace': onChange({ type: 'specified-for-this-namespace', maxConsumersPerSubscription: 1 }); break;
                  }
                }}
                value={value.type}
              />
            </div>
            {value.type === 'specified-for-this-namespace' && (
              <Input
                type="number"
                value={value.maxConsumersPerSubscription.toString()}
                onChange={v => onChange({ type: 'specified-for-this-namespace', maxConsumersPerSubscription: parseInt(v) })}
              />
            )}
          </>
        );
      }}
    </WithUpdateConfirmation>
  )
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Max consumers per subscription',
  description: (
    <div>
      Limit a maximum number of consumers per subscription for each topic in this namespace.
    </div>
  ),
  input: <FieldInput {...props} />
});

export default field;
