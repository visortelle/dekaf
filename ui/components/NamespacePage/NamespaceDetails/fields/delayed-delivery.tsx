import Select from '../../../ui/Select/Select';
import * as Notifications from '../../../app/contexts/Notifications';
import * as GrpcClient from '../../../app/contexts/GrpcClient/GrpcClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import DurationInput from "../../../ui/ConfigurationTable/DurationInput/DurationInput";
import sf from '../../../ui/ConfigurationTable/form.module.css';
import { swrKeys } from "../../../swrKeys";
import WithUpdateConfirmation from '../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/namespace_policies/v1/namespace_policies_pb';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import React from "react";
import A from '../../../ui/A/A';
import FormLabel from '../../../ui/ConfigurationTable/FormLabel/FormLabel';

const policy = 'delayedDelivery';

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

type PolicyValue = {
  type: 'inherited-from-broker-config'
} | {
  type: 'enabled',
  tickTimeMs: number;
} | {
  type: 'disabled'
};

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const { namespacePoliciesServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();

  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: initialValue, error: initialValueError } = useSWR(
    swrKey,
    async () => {
      const req = new pb.GetDelayedDeliveryRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);

      const res = await namespacePoliciesServiceClient.getDelayedDelivery(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get delayed delivery policy. ${res.getStatus()?.getMessage()}`);
        return;
      }

      let value: PolicyValue = { type: 'inherited-from-broker-config' };
      switch (res.getDelayedDeliveryCase()) {
        case pb.GetDelayedDeliveryResponse.DelayedDeliveryCase.UNSPECIFIED: {
          value = { type: 'inherited-from-broker-config' };
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

  return (
    <WithUpdateConfirmation
      initialValue={initialValue}
      onConfirm={async (value) => {
        if (value.type === 'inherited-from-broker-config') {
          const req = new pb.RemoveDelayedDeliveryRequest();
          req.setNamespace(`${props.tenant}/${props.namespace}`);

          const res = await namespacePoliciesServiceClient.removeDelayedDelivery(req, {});
          if (res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set delayed delivery policy. ${res.getStatus()?.getMessage()}`);
          }
        }

        if (value.type === 'enabled' || value.type === 'disabled') {
          const req = new pb.SetDelayedDeliveryRequest();
          req.setNamespace(`${props.tenant}/${props.namespace}`);

          if (value.type === 'enabled') {
            req.setEnabled(true);
            req.setTickTimeMs(Math.floor(value.tickTimeMs));
          }

          if (value.type === 'disabled') {
            req.setEnabled(false);
          }

          const res = await namespacePoliciesServiceClient.setDelayedDelivery(req, {});
          if (res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set delayed delivery policy. ${res.getStatus()?.getMessage()}`);
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
                  { type: 'item', value: 'enabled', title: 'Enabled' },
                  { type: 'item', value: 'disabled', title: 'Disabled' },
                ]}
                value={value.type}
                onChange={(type) => {
                  if (type === 'inherited-from-broker-config') {
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
              <>
                <FormLabel
                  content="Tick Time"
                  help={(
                    <div>
                      The tick time for when retrying on delayed delivery messages, affecting the accuracy of the delivery time compared to the scheduled time.
                    </div>
                  )}
                />
                <DurationInput
                  initialValue={value.tickTimeMs / 1000}
                  onChange={(seconds) => onChange({ ...value, tickTimeMs: seconds * 1000 })}
                />
              </>
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
  description: (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12rem' }}>
      <div>
        Delayed message delivery enables you to consume a message later. In this mechanism, a message is persistently stored in BookKeeper.
      </div>
      <div>
        This message will be delivered to a consumer once the specified delay is over.
      </div>
      <div style={{ padding: '12rem', background: 'var(--surface-color)', borderRadius: '12rem' }}>
        <strong>Only shared and key-shared subscriptions support delayed message delivery.</strong> In other subscriptions, delayed messages are dispatched immediately.
      </div>
      <A isExternalLink href="https://pulsar.apache.org/docs/next/concepts-messaging/#delayed-message-delivery">Learn more</A>
    </div>
  ),
  input: <FieldInput {...props} />
});

export default field;
