import React, { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import stringify from 'safe-stable-stringify';

import * as Notifications from '../../../app/contexts/Notifications';
import * as GrpcClient from '../../../app/contexts/GrpcClient/GrpcClient';
import Select from "../../../ui/Select/Select";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import sf from '../../../ui/ConfigurationTable/form.module.css';
import WithUpdateConfirmation from "../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation";
import { swrKeys } from "../../../swrKeys";
import * as pb from "../../../../grpc-web/tools/teal/pulsar/ui/topicpolicies/v1/topicpolicies_pb";
import { Code } from "../../../../grpc-web/google/rpc/code_pb";
import Input from "../../../ui/Input/Input";
import TooltipElement from "../../../ui/Tooltip/TooltipElement/TooltipElement";
import {help} from "../../../ui/help";

const policy = 'publishRate';

type PolicyValue = {
  type: 'inherited-from-namespace-config'
} | {
  type: 'specified',
  rateInMsg: number;
  rateInByte: number;
};

export type FieldInputProps = {
  topicType: 'persistent' | 'non-persistent';
  tenant: string;
  namespace: string;
  topic: string;
  isGlobal: boolean;
}

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const { topicPoliciesServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();
  const [key, setKey] = useState(0);

  const swrKey = props.topicType === 'persistent' ? (
      props.isGlobal ?
        swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics.policies.globalPolicy({ tenant: props.tenant, namespace: props.namespace, policy }) :
        swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics.policies.localPolicy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy })
    ) : (
      props.isGlobal ?
        swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics.policies.globalPolicy({ tenant: props.tenant, namespace: props.namespace, policy }) :
        swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics.policies.localPolicy({ tenant: props.tenant, namespace: props.namespace, topic: props.topic, policy })
    );

  const { data: initialValue, error: initialValueError } = useSWR(
    swrKey,
    async () => {
      const req = new pb.GetPublishRateRequest();
      req.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
      req.setIsGlobal(props.isGlobal);

      const res = await topicPoliciesServiceClient.getPublishRate(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get publish rate for topic. ${res.getStatus()?.getMessage()}`);
      }

      let initialValue: PolicyValue = { type: 'inherited-from-namespace-config' };
      switch (res.getPublishRateCase()) {
        case pb.GetPublishRateResponse.PublishRateCase.UNSPECIFIED: {
          initialValue = { type: 'inherited-from-namespace-config' };
          break;
        }
        case pb.GetPublishRateResponse.PublishRateCase.SPECIFIED: {
          const publishRate = res.getSpecified()!;
          initialValue = {
            type: 'specified',
            rateInMsg: publishRate.getRateInMsg(),
            rateInByte: publishRate.getRateInByte(),
          }
          break;
        }
      }

      return initialValue;
    }
  );

  if (initialValueError) {
    notifyError(`Unable to get publish rate policy. ${initialValueError}`);
  }

  if (initialValue === undefined) {
    return null;
  }

  const updatePolicy = async (value: PolicyValue): Promise<void> => {

    if (value.type === 'inherited-from-namespace-config') {
      const req = new pb.SetPublishRateRequest();
      req.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
      req.setIsGlobal(props.isGlobal)

      const res = await topicPoliciesServiceClient.removePublishRate(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to set publish rate. ${res.getStatus()?.getMessage()}`);
      }
    }

    if (value.type === 'specified') {
      const req = new pb.SetPublishRateRequest();
      req.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
      req.setIsGlobal(props.isGlobal);
      req.setRateInMsg(value.rateInMsg);
      req.setRateInByte(value.rateInByte);

      const res = await topicPoliciesServiceClient.setPublishRate(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to set publish rate. ${res.getStatus()?.getMessage()}`);
      }
    }
    // XXX Fix outdated input state after first update of any topic's policy in a new namespace.
    setTimeout(async () => {
      await mutate(swrKey);
      setKey(key + 1);
    }, 300);
  }

  return (
    <WithUpdateConfirmation<PolicyValue>
      key={stringify({ key, initialValue })}
      initialValue={initialValue}
      onConfirm={updatePolicy}
    >
      {({ value, onChange }) => (
        <>
          <div className={sf.FormItem}>
            <Select<PolicyValue['type']>
              list={[
                { type: 'item', value: 'inherited-from-namespace-config', title: 'Inherited from namespace config' },
                { type: 'item', value: 'specified', title: 'Specified' },
              ]}
              value={value.type}
              onChange={(type) => {
                if (type === 'inherited-from-namespace-config') {
                  onChange({ type });
                }
                if (type === 'specified') {
                  onChange({
                    type,
                    rateInMsg: -1,
                    rateInByte: -1,
                  });
                }
              }}
            />
          </div>
          {value.type === 'specified' && (
            <div>
              <div className={sf.FormItem}>
                <div className={sf.FormLabel}>Byte dispatch rate</div>
                <Input value={String(value.rateInByte)} onChange={v => onChange({ ...value, rateInByte: Math.floor(Number(v)) })} type='number' />
              </div>
              <div className={sf.FormItem}>
                <div className={sf.FormLabel}>Msg. dispatch rate</div>
                <Input value={String(value.rateInMsg)} onChange={v => onChange({ ...value, rateInMsg: Math.floor(Number(v)) })} type='number' />
              </div>
            </div>
          )}
        </>
      )}
    </WithUpdateConfirmation>
  );
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Publish rate',
  description: <span>Configured <TooltipElement tooltipHelp={help["messagePublishRate"]} link="https://pulsar.apache.org/docs/3.0.x/administration-stats/#producer-stats">message-publish-rate</TooltipElement> for all topics of the topic.</span>,
  input: <FieldInput {...props} />
});

export default field;
