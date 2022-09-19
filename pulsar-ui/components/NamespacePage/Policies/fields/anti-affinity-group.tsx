import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import Input from '../../../ui/ConfigurationTable/Input/Input';
import { swrKeys } from '../../../swrKeys';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import WithUpdateConfirmation from '../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation';
import Select from '../../../ui/Select/Select';

const policy = 'antiAffinityGroup';

type PolicyValue = { type: 'not-specified' } | { type: 'specified', group: string };

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const { namespaceServiceClient } = PulsarGrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig()

  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: antiAffinityGroup, error: antiAffinityGroupError } = useSWR<PolicyValue>(
    swrKey,
    async () => {
      const req = new pb.GetNamespaceAntiAffinityGroupRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);

      const res = await namespaceServiceClient.getNamespaceAntiAffinityGroup(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get anti-affinity group policy. ${res.getStatus()?.getMessage()}`);
        return { type: 'not-specified' };
      }

      const group = res.getNamespaceAntiAffinityGroup();
      return group.length > 0 ? { type: 'specified', group } : { type: 'not-specified' };
    }
  );

  if (antiAffinityGroupError) {
    notifyError(`Unable to get anti-affinity group policy. ${antiAffinityGroupError}`);
  }

  if (antiAffinityGroup === undefined) {
    return null;
  }

  return (
    <WithUpdateConfirmation<PolicyValue>
      initialValue={antiAffinityGroup}
      onConfirm={async (v) => {
        if (v.type === 'specified') {
          const req = new pb.SetNamespaceAntiAffinityGroupRequest();
          req.setNamespace(`${props.tenant}/${props.namespace}`);
          req.setNamespaceAntiAffinityGroup(v.group);

          const res = await namespaceServiceClient.setNamespaceAntiAffinityGroup(req, {});
          if (res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set anti-affinity group. ${res.getStatus()?.getMessage()}`);
            return;
          }
        }

        if (v.type === 'not-specified') {
          const req = new pb.DeleteNamespaceAntiAffinityGroupRequest();
          req.setNamespace(`${props.tenant}/${props.namespace}`);

          const res = await namespaceServiceClient.deleteNamespaceAntiAffinityGroup(req, {});
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
              <div style={{ marginTop: '12rem'}}>
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

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Anti-affinity group',
  description: <span>Anti-affinity group name for a namespace.</span>,
  input: <FieldInput {...props} />
});

export default field;
