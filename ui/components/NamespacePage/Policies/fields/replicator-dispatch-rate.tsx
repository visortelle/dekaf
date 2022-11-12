import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import sf from '../../../ui/ConfigurationTable/form.module.css';
import Select from '../../../ui/Select/Select';
import Input from "../../../ui/Input/Input";
import { swrKeys } from '../../../swrKeys';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import WithUpdateConfirmation from '../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation';
import stringify from 'safe-stable-stringify';

const policy = 'replicatorDispatchRate';

type PolicyValue = {
  type: 'inherited-from-broker-config'
} | {
  type: 'specified',
  rateInMsg: number;
  rateInByte: number;
  isRelativeToPublishRate: boolean;
  periodInSecond: number;
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
      const req = new pb.GetReplicatorDispatchRateRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);

      const res = await namespaceServiceClient.getReplicatorDispatchRate(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get dispatch rate. ${res.getStatus()?.getMessage()}`);
        return;
      }

      let initialValue: PolicyValue = { type: 'inherited-from-broker-config' };
      switch (res.getReplicatorDispatchRateCase()) {
        case pb.GetReplicatorDispatchRateResponse.ReplicatorDispatchRateCase.UNSPECIFIED: {
          initialValue = { type: 'inherited-from-broker-config' };
          break;
        }
        case pb.GetReplicatorDispatchRateResponse.ReplicatorDispatchRateCase.SPECIFIED: {
          const replicatorDispatchRate = res.getSpecified()!;
          initialValue = {
            type: 'specified',
            rateInMsg: replicatorDispatchRate.getRateInMsg(),
            rateInByte: replicatorDispatchRate.getRateInByte(),
            isRelativeToPublishRate: replicatorDispatchRate.getIsRelativeToPublishRate(),
            periodInSecond: replicatorDispatchRate.getPeriodInSecond(),
          }
          break;
        }
      }

      return initialValue;
    }
  );

  if (initialValueError) {
    notifyError(`Unable to get dispatch rate. ${initialValueError}`);
  }

  if (initialValue === undefined) {
    return null;
  }

  return (
    <WithUpdateConfirmation<PolicyValue>
      key={stringify(initialValue)}
      initialValue={initialValue}
      onConfirm={async (value) => {
        if (value.type === 'inherited-from-broker-config') {
          const req = new pb.RemoveReplicatorDispatchRateRequest();
          req.setNamespace(`${props.tenant}/${props.namespace}`);

          const res = await namespaceServiceClient.removeReplicatorDispatchRate(req, {});
          if (res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set dispatch rate. ${res.getStatus()?.getMessage()}`);
          }
        }

        if (value.type === 'specified') {
          const req = new pb.SetReplicatorDispatchRateRequest();
          req.setNamespace(`${props.tenant}/${props.namespace}`);
          req.setRateInMsg(value.rateInMsg);
          req.setRateInByte(value.rateInByte);
          req.setPeriodInSecond(value.periodInSecond);
          req.setIsRelativeToPublishRate(value.isRelativeToPublishRate);

          const res = await namespaceServiceClient.setReplicatorDispatchRate(req, {});
          if (res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set dispatch rate. ${res.getStatus()?.getMessage()}`);
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
                      rateInMsg: -1,
                      rateInByte: -1,
                      isRelativeToPublishRate: false,
                      periodInSecond: 1,
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
                <div className={sf.FormItem}>
                  <div className={sf.FormLabel}>Period in seconds</div>
                  <Input value={String(value.periodInSecond)} onChange={v => onChange({ ...value, periodInSecond: Math.floor(Number(v)) })} type='number' />
                </div>
                <div className={sf.FormItem}>
                  <div className={sf.FormLabel}>Is relative to publish rate</div>
                  <Select<'true' | 'false'>
                    list={[
                      { type: 'item', value: 'true', title: 'True' },
                      { type: 'item', value: 'false', title: 'False' },
                    ]}
                    value={value.isRelativeToPublishRate ? 'true' : 'false'}
                    onChange={v => onChange({ ...value, isRelativeToPublishRate: v === 'true' })}
                  />
                </div>
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
  title: 'Replicator dispatch rate',
  description: <span>Set replicator message-dispatch-rate for all topics of the namespace.</span>,
  input: <FieldInput {...props} />
});

export default field;
