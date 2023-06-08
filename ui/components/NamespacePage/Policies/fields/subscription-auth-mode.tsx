import Select from "../../../ui/Select/Select";
import * as Notifications from '../../../app/contexts/Notifications';
import * as GrpcClient from '../../../app/contexts/GrpcClient/GrpcClient';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import { swrKeys } from "../../../swrKeys";
import { Code } from "../../../../grpc-web/google/rpc/code_pb";
import WithUpdateConfirmation from "../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation";

const policy = 'subscriptionAuthMode';

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

type PolicyValue = 'None' | 'Prefix';

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const { namespaceServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();

  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: initialValue, error: initialValueError } = useSWR(
    swrKey,
    async () => {
      const req = new pb.GetSubscriptionAuthModeRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);

      const res = await namespaceServiceClient.getSubscriptionAuthMode(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get subscription auth mode: ${res.getStatus()?.getMessage()}`);
        return;
      }

      let v: PolicyValue = 'None';
      switch (res.getSubscriptionAuthMode()) {
        case pb.SubscriptionAuthMode.SUBSCRIPTION_AUTH_MODE_NONE: v = 'None'; break;
        case pb.SubscriptionAuthMode.SUBSCRIPTION_AUTH_MODE_PREFIX: v = 'Prefix'; break;
      }

      return v;
    }
  );

  if (initialValueError) {
    notifyError(`Unable to get subscription auth mode: ${initialValueError}`);
  }

  if (initialValue === undefined) {
    return <></>;
  }

  return (
    <WithUpdateConfirmation<PolicyValue>
      initialValue={initialValue}
      onConfirm={async (value) => {
        const req = new pb.SetSubscriptionAuthModeRequest();
        req.setNamespace(`${props.tenant}/${props.namespace}`);

        switch (value) {
          case 'None': req.setSubscriptionAuthMode(pb.SubscriptionAuthMode.SUBSCRIPTION_AUTH_MODE_NONE); break;
          case 'Prefix': req.setSubscriptionAuthMode(pb.SubscriptionAuthMode.SUBSCRIPTION_AUTH_MODE_PREFIX); break;
        }

        const res = await namespaceServiceClient.setSubscriptionAuthMode(req, {}).catch((err) => notifyError(`Unable to set subscription auth mode: ${err}`));
        if (res?.getStatus()?.getCode() !== Code.OK) {
          throw new Error(`Unable to set subscription auth mode: ${res?.getStatus()?.getMessage()}`);
        }

        mutate(swrKey);
      }}
    >
      {({ value, onChange }) => {
        return (
          <Select<PolicyValue>
            list={[{ type: 'item', value: 'None', title: 'None' }, { type: 'item', value: 'Prefix', title: 'Prefix' }]}
            value={value}
            onChange={async (v) => {
              onChange(v)
            }}
          />
        );
      }}
    </WithUpdateConfirmation>
  );
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Subscription auth mode',
  description: <span>Set subscription auth mode on a namespace.</span>,
  input: <FieldInput {...props} />
});

export default field;

