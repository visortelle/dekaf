import * as Notifications from '../../../contexts/Notifications';
import * as PulsarAdminClient from '../../../contexts/PulsarAdminClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ConfigurationTable/ConfigurationTable";
import sf from '../../../ConfigurationTable/form.module.css';
import Input from "../../../ConfigurationTable/Input/Input";
import { useEffect, useState } from 'react';
import UpdateConfirmation from '../../../ConfigurationTable/UpdateConfirmation/UpdateConfirmation';
import SelectInput from "../../../ConfigurationTable/SelectInput/SelectInput";

const policyId = 'replicatorDispatchRate';

export type ReplicatorDispatchRate = 'disabled' | {
  byteDispatchRate: number;
  dispatchRatePeriod: number;
  msgDispatchRate: number;
}

export type ReplicatorDispatchRateInputProps = {
  value: ReplicatorDispatchRate;
  onChange: (value: ReplicatorDispatchRate) => void;
};
export const ReplicatorDispatchRateInput: React.FC<ReplicatorDispatchRateInputProps> = (props) => {
  const [dispatchRate, setDispatchRate] = useState<ReplicatorDispatchRate>(props.value);

  useEffect(() => {
    setDispatchRate(() => props.value);
  }, [props.value]);

  const showUpdateConfirmation = JSON.stringify(props.value) !== JSON.stringify(dispatchRate);

  return (
    <div>
      <div className={sf.FormItem}>
        <SelectInput<'enabled' | 'disabled'>
          list={[{ value: 'enabled', title: 'Enabled' }, { value: 'disabled', title: 'Disabled' }]}
          value={dispatchRate === 'disabled' ? 'disabled' : 'enabled'}
          onChange={(value) => setDispatchRate(value === 'disabled' ? 'disabled' : { byteDispatchRate: -1, dispatchRatePeriod: 1, msgDispatchRate: -1 })}
        />
      </div>

      {dispatchRate !== 'disabled' && (
        <div>
          <div className={sf.FormItem}>
            <strong className={sf.FormLabel}>Byte dispatch rate</strong>
            <Input
              type='number'
              onChange={(v) => setDispatchRate({ ...dispatchRate, byteDispatchRate: Number(v) })}
              value={String(dispatchRate.byteDispatchRate)}
            />
          </div>

          <div className={sf.FormItem}>
            <strong className={sf.FormLabel}>Dispatch rate period</strong>
            <Input
              type='number'
              onChange={(v) => setDispatchRate({ ...dispatchRate, dispatchRatePeriod: Number(v) })}
              value={String(dispatchRate.dispatchRatePeriod)}
            />
          </div>

          <div className={sf.FormItem}>
            <strong className={sf.FormLabel}>Message dispatch rate</strong>
            <Input
              type='number'
              onChange={(v) => setDispatchRate({ ...dispatchRate, msgDispatchRate: Number(v) })}
              value={String(dispatchRate.msgDispatchRate)}
            />
          </div>
        </div>
      )}

      {showUpdateConfirmation && (
        <UpdateConfirmation
          onUpdate={() => props.onChange(dispatchRate)}
          onReset={() => setDispatchRate(props.value)}
        />
      )}
    </div>
  );
}

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const adminClient = PulsarAdminClient.useContext().client;
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();

  const onUpdateError = (err: string) => notifyError(`Can't update replicator dispatch rate. ${err}`);
  const swrKey = ['pulsar', 'tenants', props.tenant, 'namespaces', props.namespace, 'policies', policyId];

  const { data: dispatchRateData, error: dispatchRateError } = useSWR(
    swrKey,
    async () => await adminClient.namespaces.getReplicatorDispatchRate(props.tenant, props.namespace)
  );

  if (dispatchRateError) {
    notifyError(`Unable to get replicator dispatch rate. ${dispatchRateError}`);
  }

  const dispatchRate: ReplicatorDispatchRate = dispatchRateData === undefined ? 'disabled' : {
    byteDispatchRate: dispatchRateData.dispatchThrottlingRateInByte || -1,
    dispatchRatePeriod: dispatchRateData.ratePeriodInSecond || 1,
    msgDispatchRate: dispatchRateData.dispatchThrottlingRateInMsg || -1,
  }

  return (
    <ReplicatorDispatchRateInput
      value={dispatchRate}
      onChange={async (value) => {
        if (value === 'disabled') {
          await adminClient.namespaces.removeReplicatorDispatchRate(props.tenant, props.namespace);
        } else {
          await adminClient.namespaces.setReplicatorDispatchRate(
            props.tenant,
            props.namespace,
            {
              dispatchThrottlingRateInByte: value.byteDispatchRate,
              dispatchThrottlingRateInMsg: value.msgDispatchRate,
              ratePeriodInSecond: value.dispatchRatePeriod,
            }).catch(onUpdateError);
        }

        await mutate(swrKey);
      }}
    />
  )
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policyId,
  title: 'Replicator dispatch rate',
  description: <span>Set replicator message-dispatch-rate for all topics of the namespace.</span>,
  input: <FieldInput {...props} />
});

export default field;
