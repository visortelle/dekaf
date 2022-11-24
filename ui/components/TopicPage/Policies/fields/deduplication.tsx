import useSWR, { useSWRConfig } from "swr";

import WithUpdateConfirmation from "../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import Select from "../../../ui/Select/Select";
import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/topicpolicies/v1/topicpolicies_pb';
import { Code } from "../../../../grpc-web/google/rpc/code_pb";
import { swrKeys } from "../../../swrKeys";

const policy = 'deduplication';

export type FieldInputProps = {
  topicType: 'persistent' | 'non-persistent';
  tenant: string;
  namespace: string;
  topic: string;
  isGlobal: boolean;
}

type PolicyValue = 'inherited-from-namespace-config' | 'enabled' | 'disabled';

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const adminClient = PulsarGrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();

  const swrKey = props.topicType === 'persistent' ?
    swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy, isGlobal: props.isGlobal }) :
    swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy, isGlobal: props.isGlobal });

  const { data: initialValue, error: initialValueError } = useSWR(
    swrKey,
    async () => {
      const req = new pb.GetDeduplicationRequest();
      req.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
      req.setIsGlobal(props.isGlobal);

      const res = await adminClient.topicpoliciesServiceClient.getDeduplication(req, {});
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
      initialValue={initialValue}
      onConfirm={async (v) => {
        if (v === 'inherited-from-namespace-config') {
          const req = new pb.RemoveDeduplicationRequest();
          req.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
          req.setIsGlobal(props.isGlobal);

          const res = await adminClient.topicpoliciesServiceClient.removeDeduplication(req, {});

          if (res?.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set deduplication policy. ${res?.getStatus()?.getMessage()}`);
          }
        }

        if (v === 'enabled' || v === 'disabled') {
          const req = new pb.SetDeduplicationRequest();
          req.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
          req.setIsGlobal(props.isGlobal);
          req.setEnabled(v === 'enabled');

          const res = await adminClient.topicpoliciesServiceClient.setDeduplication(req, {})
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
  description: <span>Enable or disable deduplication for a topic.</span>,
  input: <FieldInput {...props} />
});

export default field;
