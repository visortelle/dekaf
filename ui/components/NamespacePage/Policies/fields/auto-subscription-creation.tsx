import Select from "../../../ui/Select/Select";
import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import { swrKeys } from "../../../swrKeys";
import * as pb from "../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb";
import { Code } from "../../../../grpc-web/google/rpc/code_pb";
import WithUpdateConfirmation from "../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation";

const policy = 'autoSubscriptionCreation';

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

type PolicyValue = 'inherited-from-broker-config' | 'enabled' | 'disabled';

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const { namespaceServiceClient } = PulsarGrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();

  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: initialValue, error: initialValueError } = useSWR(
    swrKey,
    async () => {
      const req = new pb.GetAutoSubscriptionCreationRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);

      const res = await namespaceServiceClient.getAutoSubscriptionCreation(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get auto subscription creation policy. ${res.getStatus()?.getMessage()}`);
        return;
      }

      let v: PolicyValue = 'inherited-from-broker-config';
      switch (res.getAutoSubscriptionCreation()) {
        case pb.AutoSubscriptionCreation.AUTO_SUBSCRIPTION_CREATION_ENABLED: v = 'enabled'; break;
        case pb.AutoSubscriptionCreation.AUTO_SUBSCRIPTION_CREATION_DISABLED: v = 'disabled'; break
        case pb.AutoSubscriptionCreation.AUTO_SUBSCRIPTION_CREATION_INHERITED_FROM_BROKER_CONFIG: v = 'inherited-from-broker-config'; break;
      };
      return v;
    }
  );

  if (initialValueError) {
    notifyError(`Unable to get auto subscription creation policy. ${initialValueError}`);
  }

  if (initialValue === undefined) {
    return null;
  }

  return (
    <WithUpdateConfirmation<PolicyValue>
      initialValue={initialValue}
      onConfirm={async (v) => {
        if (v === 'enabled' || v === 'disabled') {
          const req = new pb.SetAutoSubscriptionCreationRequest();
          req.setNamespace(`${props.tenant}/${props.namespace}`);

          let vPb: pb.AutoSubscriptionCreation;
          switch (v) {
            case 'enabled': vPb = pb.AutoSubscriptionCreation.AUTO_SUBSCRIPTION_CREATION_ENABLED; break;
            case 'disabled': vPb = pb.AutoSubscriptionCreation.AUTO_SUBSCRIPTION_CREATION_DISABLED; break;
          }

          req.setAutoSubscriptionCreation(vPb);

          const res = await namespaceServiceClient.setAutoSubscriptionCreation(req, {}).catch(err => notifyError(`Unable to set auto subscription creation policy. ${err}`));
          if (res === undefined) {
            return;
          }
          if (res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set auto subscription creation policy. ${res.getStatus()?.getMessage()}`);
            return;
          }
        }

        if (v === 'inherited-from-broker-config') {
          const req = new pb.RemoveAutoSubscriptionCreationRequest();
          req.setNamespace(`${props.tenant}/${props.namespace}`);

          const res = await namespaceServiceClient.removeAutoSubscriptionCreation(req, {}).catch(err => notifyError(`Unable to set auto subscription creation policy. ${err}`));
          if (res?.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set auto subscription creation policy. ${res?.getStatus()?.getMessage()}`);
            return;
          }
        }

        await mutate(swrKey);
      }}
    >
      {({ value, onChange }) => {
        return (
          <Select<PolicyValue>
            list={[
              { type: 'item', value: 'inherited-from-broker-config', title: 'Inherited from broker config' },
              { type: 'item', value: 'disabled', title: 'Disabled for this namespace' },
              { type: 'item', value: 'enabled', title: 'Enabled for this namespace' }
            ]}
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
  title: 'Auto subscription creation',
  description: <span>Enable or disable auto subscription creation.</span>,
  input: <FieldInput {...props} />
});

export default field;
