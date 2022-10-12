import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import DurationInput from '../../../ui/ConfigurationTable/DurationInput/DurationInput';
import Select from '../../../ui/Select/Select';
import sf from '../../../ui/ConfigurationTable/form.module.css';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb';
import { swrKeys } from '../../../swrKeys';
import WithUpdateConfirmation from '../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';

const policy = 'messageTtl';

type PolicyValue = { type: 'inherited-from-broker-config' } | { type: 'unlimited' } | {
  type: 'specified-for-this-namespace',
  messageTtl: number,
};

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const { namespaceServiceClient } = PulsarGrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();

  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: initialValue, error: initialValueError } = useSWR(
    swrKey,
    async () => {
      const req = new pb.GetMessageTtlRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);

      const res = await namespaceServiceClient.getMessageTtl(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get message TTL: ${res.getStatus()?.getMessage()}`);
        return;
      }

      let initialValue: PolicyValue = { type: 'inherited-from-broker-config' };
      switch (res.getMessageTtlCase()) {
        case pb.GetMessageTtlResponse.MessageTtlCase.UNSPECIFIED: {
          initialValue = { type: 'inherited-from-broker-config' };
          break;
        }
        case pb.GetMessageTtlResponse.MessageTtlCase.SPECIFIED: {
          const messageTtl = res.getSpecified()?.getMessageTtl() ?? 0;

          if (messageTtl === 0) {
            initialValue = { type: 'unlimited' };
          } else {
            initialValue = { type: 'specified-for-this-namespace', messageTtl };
          }

          break;
        }
      }

      return initialValue;
    }
  );

  if (initialValueError) {
    notifyError(`Unable to get message TTL. ${initialValueError}`);
  }

  if (initialValue === undefined) {
    return null;
  }

  return (
    <WithUpdateConfirmation<PolicyValue>
      initialValue={initialValue}
      onConfirm={async (value) => {
        if (value.type === 'inherited-from-broker-config') {
          const req = new pb.RemoveMessageTtlRequest();
          req.setNamespace(`${props.tenant}/${props.namespace}`);

          const res = await namespaceServiceClient.removeMessageTtl(req, {});
          if (res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set message TTL: ${res.getStatus()?.getMessage()}`);
          }
        }

        if (value.type === 'unlimited' || value.type === 'specified-for-this-namespace') {
          const req = new pb.SetMessageTtlRequest();
          req.setNamespace(`${props.tenant}/${props.namespace}`);

          if (value.type === 'unlimited') {
            req.setMessageTtl(0);
          }

          if (value.type === 'specified-for-this-namespace') {
            req.setMessageTtl(value.messageTtl);
          }

          const res = await namespaceServiceClient.setMessageTtl(req, {});
          if (res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set message TTL: ${res.getStatus()?.getMessage()}`);
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
                    case 'specified-for-this-namespace': onChange({ type: 'specified-for-this-namespace', messageTtl: 1 }); break;
                  }
                }}
                value={value.type}
              />
            </div>
            {value.type === 'specified-for-this-namespace' && (
              <DurationInput
                value={value.messageTtl}
                onChange={v => onChange({ type: 'specified-for-this-namespace', messageTtl: v })}
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
  title: 'Message TTL',
  description: <span>By default, Pulsar stores all unacknowledged messages forever. This can lead to heavy disk space usage in cases where a lot of messages are going unacknowledged. If disk space is a concern, you can set a time to live (TTL) that determines how long unacknowledged messages will be retained.</span>,
  input: <FieldInput {...props} />
});

export default field;
