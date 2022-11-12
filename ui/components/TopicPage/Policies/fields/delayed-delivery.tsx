import useSWR, { useSWRConfig } from "swr";
import stringify from "safe-stable-stringify";

import Select from '../../../ui/Select/Select';
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import DurationInput from "../../../ui/ConfigurationTable/DurationInput/DurationInput";
import sf from '../../../ui/ConfigurationTable/form.module.css';
import WithUpdateConfirmation from '../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation';
import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import { swrKeys } from "../../../swrKeys";
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/topicpolicies/v1/topicpolicies_pb';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';

const policy = 'delayedDelivery';

export type FieldInputProps = {
  topicType: 'persistent' | 'non-persistent';
  tenant: string;
  namespace: string;
  topic: string;
  isGlobal: boolean;
}

type PolicyValue = {
  type: 'inherited-from-namespace-config'
} | {
  type: 'enabled',
  tickTimeMs: number;
} | {
  type: 'disabled'
};

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const { topicpoliciesServiceClient } = PulsarGrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();

  const swrKey = props.topicType === 'persistent' ?
    swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy, isGlobal: props.isGlobal }) :
    swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy, isGlobal: props.isGlobal });

  const { data: initialValue, error: initialValueError } = useSWR(
    swrKey,
    async () => {
      const req = new pb.GetDelayedDeliveryRequest();
      req.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
      req.setIsGlobal(props.isGlobal);

      const res = await topicpoliciesServiceClient.getDelayedDelivery(req, {});

      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get delayed delivery policy. ${res.getStatus()?.getMessage()}`);
        return;
      }

      let value: PolicyValue = { type: 'inherited-from-namespace-config' };

      switch (res.getDelayedDeliveryCase()) {
        case pb.GetDelayedDeliveryResponse.DelayedDeliveryCase.UNSPECIFIED: {
          value = { type: 'inherited-from-namespace-config' };
          break;
        }
        case pb.GetDelayedDeliveryResponse.DelayedDeliveryCase.SPECIFIED: {
          if (res.getSpecified()?.getEnabled()) {
            value = { type: 'enabled', tickTimeMs: res.getSpecified()?.getTickTimeMs() ?? 0 };
          } else {
            value = { type: 'disabled' };
          }

          break;
        }
      }

      return value;
    }
  );

  if (initialValueError) {
    notifyError(`Unable to get delayed delivery: ${initialValueError}`);
  }

  if (initialValue === undefined) {
    return null;
  }

  const updatePolicy = async (value: PolicyValue) => {
    if (value.type === 'inherited-from-namespace-config') {
      const req = new pb.RemoveDelayedDeliveryRequest();
      req.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
      req.setIsGlobal(props.isGlobal);

      const res = await topicpoliciesServiceClient.removeDelayedDelivery(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to set delayed delivery policy. ${res.getStatus()?.getMessage()}`);
      }
    }

    if (value.type === 'enabled' || value.type === 'disabled') {
      const req = new pb.SetDelayedDeliveryRequest();
      req.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
      req.setIsGlobal(props.isGlobal);

      if (value.type === 'enabled') {
        req.setEnabled(true);
        req.setTickTimeMs(Math.floor(value.tickTimeMs));
      }

      if (value.type === 'disabled') {
        req.setEnabled(false);
      }

      const res = await topicpoliciesServiceClient.setDelayedDelivery(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to set delayed delivery policy. ${res.getStatus()?.getMessage()}`);
      }
    }

    // XXX Fix outdated input state after first update of any topic's policy in a new namespace.
    setTimeout(() => mutate(swrKey), 300);
  }

  return (
    <WithUpdateConfirmation
      key={stringify(initialValue)}
      initialValue={initialValue}
      onConfirm={updatePolicy}
    >
      {({ value, onChange }) => {
        return (
          <>
            <div className={sf.FormItem}>
              <Select<PolicyValue['type']>
                list={[
                  { type: 'item', value: 'inherited-from-namespace-config', title: 'Inherited from namespace config' },
                  { type: 'item', value: 'enabled', title: 'Enabled' },
                  { type: 'item', value: 'disabled', title: 'Disabled' },
                ]}
                value={value.type}
                onChange={(type) => {
                  if (type === 'inherited-from-namespace-config') {
                    onChange({ type });
                  }
                  if (type === 'disabled') {
                    onChange({ type });
                  }
                  if (type === 'enabled') {
                    onChange({ type, tickTimeMs: 1000 });
                  }
                }}
              />
            </div>
            {value.type === 'enabled' && (
              <DurationInput
                initialValue={value.tickTimeMs / 1000}
                onChange={(seconds) => onChange({ ...value, tickTimeMs: seconds * 1000 })}
              />
            )}
          </>
        );
      }}
    </WithUpdateConfirmation>
  );
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Delayed delivery',
  description: <span>Set the delayed delivery policy on a topic.</span>,
  input: <FieldInput {...props} />
});

export default field;
