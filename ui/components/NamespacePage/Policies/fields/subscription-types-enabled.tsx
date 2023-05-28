import Select, { ListItem } from "../../../ui/Select/Select"; import * as Notifications from '../../../app/contexts/Notifications';
import * as GrpcClient from '../../../app/contexts/GrpcClient/GrpcClient';
import * as Either from 'fp-ts/lib/Either';
import useSWR, { useSWRConfig } from "swr";
import ListInput from "../../../ui/ConfigurationTable/ListInput/ListInput";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import sf from '../../../ui/ConfigurationTable/form.module.css';
import { useState } from "react";
import { swrKeys } from "../../../swrKeys";
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb';
import WithUpdateConfirmation from "../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation";
import { Code } from "../../../../grpc-web/google/rpc/code_pb";

function subscriptionTypeFromPb(pbType: pb.SubscriptionType): SubscriptionType {
  switch (pbType) {
    case pb.SubscriptionType.SUBSCRIPTION_TYPE_SHARED:
      return 'Shared';
    case pb.SubscriptionType.SUBSCRIPTION_TYPE_EXCLUSIVE:
      return 'Exclusive';
    case pb.SubscriptionType.SUBSCRIPTION_TYPE_FAILOVER:
      return 'Failover';
    case pb.SubscriptionType.SUBSCRIPTION_TYPE_KEY_SHARED:
      return 'Key_Shared';
    default:
      throw new Error(`Unknown subscription type: ${pbType}`);
  }
}

function subscriptionTypeToPb(type: SubscriptionType): pb.SubscriptionType {
  switch (type) {
    case 'Shared':
      return pb.SubscriptionType.SUBSCRIPTION_TYPE_SHARED;
    case 'Exclusive':
      return pb.SubscriptionType.SUBSCRIPTION_TYPE_EXCLUSIVE;
    case 'Failover':
      return pb.SubscriptionType.SUBSCRIPTION_TYPE_FAILOVER;
    case 'Key_Shared':
      return pb.SubscriptionType.SUBSCRIPTION_TYPE_KEY_SHARED;
    default:
      throw new Error(`Unknown subscription type: ${type}`);
  }
}

const policy = 'subscriptionTypesEnabled';

const subscriptionTypes = ["Exclusive", "Shared", "Failover", "Key_Shared"] as const;
export type SubscriptionType = typeof subscriptionTypes[number];

type PolicyValue =
  { type: 'inherited-from-broker-config' } |
  { type: 'specified-for-this-namespace', subscriptionTypes: SubscriptionType[] };

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const [key, setKey] = useState(0);
  const { namespaceServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig()

  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: initialValue, error: initialValueError } = useSWR(
    swrKey,
    async () => {
      const req = new pb.GetSubscriptionTypesEnabledRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);

      const res = await namespaceServiceClient.getSubscriptionTypesEnabled(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get subscription types enabled. ${res.getStatus()?.getMessage()}`);
        return;
      }

      let initialValue: PolicyValue = { type: 'inherited-from-broker-config' };
      switch (res.getSubscriptionTypesEnabledCase()) {
        case pb.GetSubscriptionTypesEnabledResponse.SubscriptionTypesEnabledCase.INHERITED: {
          initialValue = { type: 'inherited-from-broker-config' };
          break;
        }
        case pb.GetSubscriptionTypesEnabledResponse.SubscriptionTypesEnabledCase.SPECIFIED: {
          initialValue = {
            type: 'specified-for-this-namespace',
            subscriptionTypes: res.getSpecified()?.getTypesList().map(subscriptionTypeFromPb) || []
          }
          break;
        }
      }

      return initialValue;
    }
  );

  if (initialValueError) {
    notifyError(`Unable to get subscription types enabled. ${initialValueError}`);
  }

  if (initialValue === undefined) {
    return <></>
  }

  return (
    <WithUpdateConfirmation<PolicyValue>
      key={key}
      initialValue={initialValue}
      onConfirm={async (value) => {
        if (value.type === 'inherited-from-broker-config') {
          const req = new pb.RemoveSubscriptionTypesEnabledRequest();
          req.setNamespace(`${props.tenant}/${props.namespace}`);

          const res = await namespaceServiceClient.removeSubscriptionTypesEnabled(req, {});
          if (res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set subscription types enabled. ${res.getStatus()?.getMessage()}`);
            return;
          }
        }

        if (value.type === 'specified-for-this-namespace') {
          const req = new pb.SetSubscriptionTypesEnabledRequest();
          req.setNamespace(`${props.tenant}/${props.namespace}`);
          req.setTypesList(value.subscriptionTypes.map(subscriptionTypeToPb));

          const res = await namespaceServiceClient.setSubscriptionTypesEnabled(req, {});
          if (res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set subscription types enabled. ${res.getStatus()?.getMessage()}`);
            return;
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
                  { type: 'item', value: 'specified-for-this-namespace', title: 'Specified for this namespace' }
                ]}
                onChange={v => {
                  switch (v) {
                    case 'inherited-from-broker-config':
                      onChange({ type: 'inherited-from-broker-config' });
                      break;
                    case 'specified-for-this-namespace':
                      onChange({
                        type: 'specified-for-this-namespace',
                        subscriptionTypes: ['Exclusive', 'Failover', 'Shared', 'Key_Shared']
                      });
                      break;
                  }
                }}
                value={value.type}
              />
            </div>
            {value.type === 'specified-for-this-namespace' && (() => {
              const list = subscriptionTypes
                .filter(t => !value.subscriptionTypes.some(ste => ste === t))
                .map<ListItem<SubscriptionType>>(c => ({ type: 'item', value: c, title: c }))
                .sort((a, b) => a.title.localeCompare(b.title, 'en', { numeric: true }))

              return (
                <div className={sf.FormItem}>
                  <ListInput<SubscriptionType>
                    value={value.subscriptionTypes.sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))}
                    getId={(v) => v}
                    renderItem={(v) => <div>{v}</div>}
                    editor={(subscriptionTypes.length === value.subscriptionTypes.length) ? undefined : {
                      render: (v, onChange) => {
                        return (
                          <Select<SubscriptionType>
                            list={list}
                            value={v}
                            onChange={(v) => onChange(v)}
                          />
                        )
                      },
                      initialValue: list[0].type === 'item' ? list[0].value : undefined,
                    }}
                    onRemove={(id) => {
                      onChange({ ...value, subscriptionTypes: value.subscriptionTypes.filter(v => v !== id) });
                    }}
                    onAdd={value.subscriptionTypes.length === subscriptionTypes.length ? undefined : (id) => {
                      onChange({ ...value, subscriptionTypes: [...value.subscriptionTypes, id] })
                    }}
                    validate={(_) => Either.right(undefined)}
                  />
                </div>
              )
            })()}
          </>
        );
      }}
    </WithUpdateConfirmation>
  );
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Subscription types enabled',
  description: <span>Subscription types enabled for a namespace.</span>,
  input: <FieldInput {...props} />
});

export default field;
