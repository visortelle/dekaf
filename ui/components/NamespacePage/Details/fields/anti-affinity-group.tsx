import * as Notifications from '../../../app/contexts/Notifications';
import * as GrpcClient from '../../../app/contexts/GrpcClient/GrpcClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import Input from '../../../ui/ConfigurationTable/Input/Input';
import { swrKeys } from '../../../swrKeys';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/namespace_policies/v1/namespace_policies_pb';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import WithUpdateConfirmation from '../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation';
import Select from '../../../ui/Select/Select';
import React from "react";
import TooltipElement from "../../../ui/Tooltip/TooltipElement/TooltipElement";

const policy = 'antiAffinityGroup';

type PolicyValue = { type: 'not-specified' } | { type: 'specified', group: string };

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const { namespacePoliciesServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig()

  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: initialValue, error: initialValueError } = useSWR<PolicyValue>(
    swrKey,
    async () => {
      const req = new pb.GetNamespaceAntiAffinityGroupRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);

      const res = await namespacePoliciesServiceClient.getNamespaceAntiAffinityGroup(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get anti-affinity group policy. ${res.getStatus()?.getMessage()}`);
        return { type: 'not-specified' };
      }

      const group = res.getNamespaceAntiAffinityGroup();
      return group.length > 0 ? { type: 'specified', group } : { type: 'not-specified' };
    },
    {}
  );

  if (initialValueError) {
    notifyError(`Unable to get anti-affinity group policy. ${initialValueError}`);
  }

  if (initialValue === undefined) {
    return null;
  }

  return (
    <WithUpdateConfirmation<PolicyValue>
      initialValue={initialValue}
      onConfirm={async (v) => {
        if (v.type === 'specified') {
          const req = new pb.SetNamespaceAntiAffinityGroupRequest();
          req.setNamespace(`${props.tenant}/${props.namespace}`);
          req.setNamespaceAntiAffinityGroup(v.group);

          const res = await namespacePoliciesServiceClient.setNamespaceAntiAffinityGroup(req, {});
          if (res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set anti-affinity group. ${res.getStatus()?.getMessage()}`);
            return;
          }
        }

        if (v.type === 'not-specified') {
          const req = new pb.RemoveNamespaceAntiAffinityGroupRequest();
          req.setNamespace(`${props.tenant}/${props.namespace}`);

          const res = await namespacePoliciesServiceClient.removeNamespaceAntiAffinityGroup(req, {});
          if (res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to delete anti-affinity group. ${res.getStatus()?.getMessage()}`);
            return;
          }
        }

        await mutate(swrKey);
      }}
    >
      {({ value, onChange }) => {
        return (
          <>
            <Select<PolicyValue['type']>
              list={[
                { type: 'item', value: 'not-specified', title: 'Not specified' },
                { type: 'item', value: 'specified', title: 'Specified' }
              ]}
              value={value.type}
              onChange={(v) => onChange(v === 'specified' ? { type: v, group: '' } : { type: v })}
            />
            {value.type === 'specified' && (
              <div style={{ marginTop: '12rem' }}>
                <Input
                  value={value.group}
                  onChange={(v) => onChange({ ...value, group: v })}
                />
              </div>
            )}
          </>
        );
      }}
    </WithUpdateConfirmation>
  )
}

type TermKey =
  'antiAffinityGroup';

const help: Record<TermKey, React.ReactNode> = {
  antiAffinityGroup: <div>A group of namespaces within an application that are designed to avoid downtime by being owned by different failure domains and different brokers. The purpose is to ensure that if one failure domain or broker goes down, only the namespaces associated with that specific domain are affected, while the rest of the namespaces remain available without any impact.</div>
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Anti-affinity group',
  description: <span><TooltipElement tooltipHelp={help["antiAffinityGroup"]} link="https://github.com/apache/pulsar/issues/840">Anti-affinity group</TooltipElement> name for a namespace.</span>,
  input: <FieldInput {...props} />
});

export default field;
