import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import stringify from 'safe-stable-stringify';

import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import Select from "../../../ui/Select/Select";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import sf from '../../../ui/ConfigurationTable/form.module.css';
import WithUpdateConfirmation from "../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation";
import { swrKeys } from "../../../swrKeys";
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb';
import { Code } from "../../../../grpc-web/google/rpc/code_pb";
import Input from "../../../ui/Input/Input";

const policy = 'publishRate';

type PolicyValue = {
  type: 'inherited-from-broker-config'
} | {
  type: 'specified-for-this-namespace',
  rateInMsg: number;
  rateInByte: number;
};

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const { namespaceServiceClient } = PulsarGrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();
  const [key, setKey] = useState(0);

  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: initialValue, error: initialValueError } = useSWR(
    swrKey,
    async () => {
      const req = new pb.GetPublishRateRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);

      const res = await namespaceServiceClient.getPublishRate(req, {});
      console.log(res)
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get publish rate for namespace. ${res.getStatus()?.getMessage()}`);
      }

      let initialValue: PolicyValue = { type: 'inherited-from-broker-config' };
      switch (res.getPublishRateCase()) {
        case pb.GetPublishRateResponse.PublishRateCase.UNSPECIFIED: {
          initialValue = { type: 'inherited-from-broker-config'};
          break;
        }
        case pb.GetPublishRateResponse.PublishRateCase.SPECIFIED: {
          const publishRate = res.getSpecified()!;
          initialValue = {
            type: 'specified-for-this-namespace',
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

    if (value.type === 'inherited-from-broker-config') {
      const req = new pb.SetPublishRateRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);
  
      const res = await namespaceServiceClient.removePublishRate(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to set publish rate. ${res.getStatus()?.getMessage()}`);
      }
    }

    if (value.type === 'specified-for-this-namespace') {
      const req = new pb.SetPublishRateRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);
      req.setRateInMsg(value.rateInMsg);
      req.setRateInByte(value.rateInByte);

      const res = await namespaceServiceClient.setPublishRate(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to set publish rate. ${res.getStatus()?.getMessage()}`);
      }
    }

    setTimeout(async () => {
      await mutate(swrKey);
      setKey(key + 1); // Force rerender if fractional duration (1.2, 5.3, etc.) is set.
    }, 300);
  }

  return (
    <WithUpdateConfirmation<PolicyValue>
      key={stringify({key, initialValue})}
      initialValue={initialValue}
      onConfirm={updatePolicy}
    >
      {({ value, onChange }) => (
        <>
          <div className={sf.FormItem}>
            <Select<PolicyValue['type']>
              list={[
                { type: 'item', value: 'inherited-from-broker-config', title: 'Inherited from broker config' },
                { type: 'item', value: 'specified-for-this-namespace', title: 'Specified for this namespace' },
              ]}
              value={value.type}
              onChange={(type) => {
                if (type === 'inherited-from-broker-config') {
                  onChange({ type });
                }
                if (type === 'specified-for-this-namespace') {
                  onChange({
                    type,
                    rateInMsg: -1,
                    rateInByte: -1,
                  });
                }
              }}
            />
          </div>
          {value.type === 'specified-for-this-namespace' && (
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
  description: <span>Info about publish rate<br />More info</span>,
  input: <FieldInput {...props} />
});



export default field;
