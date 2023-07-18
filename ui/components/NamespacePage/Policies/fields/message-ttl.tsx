import * as Notifications from '../../../app/contexts/Notifications';
import * as GrpcClient from '../../../app/contexts/GrpcClient/GrpcClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import DurationInput from '../../../ui/ConfigurationTable/DurationInput/DurationInput';
import Select from '../../../ui/Select/Select';
import sf from '../../../ui/ConfigurationTable/form.module.css';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb';
import { swrKeys } from '../../../swrKeys';
import WithUpdateConfirmation from '../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import React, { useState } from 'react';
import A from "../../../ui/A/A";

const policy = 'messageTtl';

type PolicyValue = { type: 'inherited-from-broker-config' } | { type: 'unlimited' } | {
  type: 'specified-for-this-namespace',
  messageTtlSeconds: number,
};

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const { namespaceServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();
  const [key, setKey] = useState(0);

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
          const messageTtlSeconds = res.getSpecified()?.getMessageTtlSeconds() ?? 0;

          if (messageTtlSeconds === 0) {
            initialValue = { type: 'unlimited' };
          } else {
            initialValue = { type: 'specified-for-this-namespace', messageTtlSeconds: messageTtlSeconds };
          }

          break;
        }
      }

      return initialValue;
    }
  );

  if (initialValueError) {
    notifyError(`Unable to get message TTL: ${initialValueError}`);
  }

  if (initialValue === undefined) {
    return null;
  }

  return (
    <WithUpdateConfirmation<PolicyValue>
      key={key}
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
            req.setMessageTtlSeconds(0);
          }

          if (value.type === 'specified-for-this-namespace') {
            req.setMessageTtlSeconds(Math.floor(value.messageTtlSeconds));
          }

          const res = await namespaceServiceClient.setMessageTtl(req, {});
          if (res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set message TTL: ${res.getStatus()?.getMessage()}`);
          }
        }

        await mutate(swrKey);
        setKey(key + 1);
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
                    case 'specified-for-this-namespace': onChange({ type: 'specified-for-this-namespace', messageTtlSeconds: 1 }); break;
                  }
                }}
                value={value.type}
              />
            </div>
            {value.type === 'specified-for-this-namespace' && (
              <DurationInput
                initialValue={value.messageTtlSeconds}
                onChange={v => onChange({ type: 'specified-for-this-namespace', messageTtlSeconds: v })}
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
  description: <span>By default, Pulsar stores all unacknowledged messages forever. This can lead to heavy disk space usage in cases where a lot of messages are going unacknowledged. If disk space is a concern, you can set a <A isExternalLink href={"https://pulsar.apache.org/docs/3.0.x/cookbooks-retention-expiry/#time-to-live-ttl"}>time to live (TTL)</A> that determines how long unacknowledged messages will be retained.</span>,
  input: <FieldInput {...props} />
});

export default field;
