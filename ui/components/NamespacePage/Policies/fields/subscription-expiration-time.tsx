import * as Notifications from '../../../app/contexts/Notifications';
import * as GrpcClient from '../../../app/contexts/GrpcClient/GrpcClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import sf from '../../../ui/ConfigurationTable/form.module.css';
import Select from '../../../ui/Select/Select';
import { swrKeys } from '../../../swrKeys';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import DurationInput from '../../../ui/ConfigurationTable/DurationInput/DurationInput';
import WithUpdateConfirmation from '../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation';
import { useState } from 'react';

const policy = 'subscriptionExpirationTime';

type PolicyValue = {
  type: 'inherited-from-broker-config'
} | {
  type: 'specified',
  subscriptionExpirationTimeInSeconds: number;
};

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const [key, setKey] = useState(0);
  const { namespaceServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();

  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: initialValue, error: initialValueError } = useSWR(
    swrKey,
    async () => {
      const req = new pb.GetSubscriptionExpirationTimeRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);

      const res = await namespaceServiceClient.getSubscriptionExpirationTime(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get subscribe rate. ${res.getStatus()?.getMessage()}`);
        return;
      }

      let initialValue: PolicyValue = { type: 'inherited-from-broker-config' };
      switch (res.getSubscriptionExpirationTimeCase()) {
        case pb.GetSubscriptionExpirationTimeResponse.SubscriptionExpirationTimeCase.UNSPECIFIED: {
          initialValue = { type: 'inherited-from-broker-config' };
          break;
        }
        case pb.GetSubscriptionExpirationTimeResponse.SubscriptionExpirationTimeCase.SPECIFIED: {
          const subscriptionExpirationTime = res.getSpecified()!;
          initialValue = {
            type: 'specified',
            subscriptionExpirationTimeInSeconds: subscriptionExpirationTime.getSubscriptionExpirationTimeInMinutes() * 60,
          }
          break;
        }
      }

      return initialValue;
    }
  );

  if (initialValueError) {
    notifyError(`Unable to get subscribe rate. ${initialValueError}`);
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
          const req = new pb.RemoveSubscriptionExpirationTimeRequest();
          req.setNamespace(`${props.tenant}/${props.namespace}`);

          const res = await namespaceServiceClient.removeSubscriptionExpirationTime(req, {});
          if (res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set subscribe rate. ${res.getStatus()?.getMessage()}`);
          }
        }

        if (value.type === 'specified') {
          const req = new pb.SetSubscriptionExpirationTimeRequest();
          req.setNamespace(`${props.tenant}/${props.namespace}`);
          req.setSubscriptionExpirationTimeInMinutes(Math.floor(value.subscriptionExpirationTimeInSeconds / 60));

          const res = await namespaceServiceClient.setSubscriptionExpirationTime(req, {});
          if (res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set subscribe rate. ${res.getStatus()?.getMessage()}`);
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
                  { type: 'item', value: 'specified', title: 'Specified' },
                ]}
                value={value.type}
                onChange={(type) => {
                  if (type === 'inherited-from-broker-config') {
                    onChange({ type });
                  }
                  if (type === 'specified') {
                    onChange({
                      type,
                      subscriptionExpirationTimeInSeconds: 0,
                    });
                  }
                }}
              />
            </div>
            {value.type === 'specified' && (
              <div>
                <div className={sf.FormLabel}>Expiration time (rounded to minutes)</div>
                <DurationInput
                  initialValue={value.subscriptionExpirationTimeInSeconds}
                  onChange={v => onChange({ ...value, subscriptionExpirationTimeInSeconds: v })}
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
  title: 'Subscription expiration time',
  description: <span>Set subscription expiration time for all topics of the namespace.</span>,
  input: <FieldInput {...props} />
});

export default field;
