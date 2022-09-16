import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import Input from '../../../ui/ConfigurationTable/Input/InputWithUpdateConfirmation';
import { swrKeys } from '../../../swrKeys';
import { DeleteNamespaceAntiAffinityGroupRequest, GetNamespaceAntiAffinityGroupRequest, SetNamespaceAntiAffinityGroupRequest } from '../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';

const policy = 'antiAffinityGroup';

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const { namespaceServiceClient } = PulsarGrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig()

  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: antiAffinityGroup, error: antiAffinityGroupError } = useSWR(
    swrKey,
    async () => {
      const req = new GetNamespaceAntiAffinityGroupRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);

      const res = await namespaceServiceClient.getNamespaceAntiAffinityGroup(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Can't get anti-affinity group. ${res.getStatus()?.getMessage()}`);
        return;
      }

      return res.getNamespaceAntiAffinityGroup();
    }
  );

  if (antiAffinityGroupError) {
    notifyError(`Unable to get message TTL. ${antiAffinityGroupError}`);
  }

  return (
    <Input
      value={antiAffinityGroup || ''}
      onChange={async (antiAffinityGroup) => {
        if (antiAffinityGroup === '') {
          const req = new DeleteNamespaceAntiAffinityGroupRequest();
          req.setNamespace(`${props.tenant}/${props.namespace}`);

          const res = await namespaceServiceClient.deleteNamespaceAntiAffinityGroup(req, {}).catch((err) => notifyError(`Can't delete anti-affinity group. ${err}`));
          if (res?.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Can't delete anti-affinity group. ${res?.getStatus()?.getMessage()}`);
            return;
          }

          await mutate(swrKey);
          return;
        }

        const req = new SetNamespaceAntiAffinityGroupRequest();
        req.setNamespace(`${props.tenant}/${props.namespace}`);
        req.setNamespaceAntiAffinityGroup(antiAffinityGroup);

        const res = await namespaceServiceClient.setNamespaceAntiAffinityGroup(req, {}).catch((err) => notifyError(`Can't set anti-affinity group. ${err}`));
        if (res?.getStatus()?.getCode() !== Code.OK) {
          notifyError(`Can't set anti-affinity group. ${res?.getStatus()?.getMessage()}`);
          return;
        }

        await mutate(swrKey);
      }}
      placeholder="Enter group name"
    />
  )
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Anti-affinity group',
  description: <span>Anti-affinity group name for a namespace.</span>,
  input: <FieldInput {...props} />
});

export default field;
