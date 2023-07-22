import Select from "../../../ui/Select/Select";
import * as Notifications from '../../../app/contexts/Notifications';
import * as GrpcClient from '../../../app/contexts/GrpcClient/GrpcClient';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import sf from '../../../ui/ConfigurationTable/form.module.css';
import MemorySizeInput from "../../../ui/ConfigurationTable/MemorySizeInput/MemorySizeInput";
import DurationInput from "../../../ui/ConfigurationTable/DurationInput/DurationInput";
import { useState } from "react";
import { swrKeys } from "../../../swrKeys";
import { Code } from "../../../../grpc-web/google/rpc/code_pb";
import WithUpdateConfirmation, { ValidationError } from "../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation";
import A from "../../../ui/A/A";

/*
Time limit	  Size limit  Message retention
--------------------------------------------------
-1           -1	        Infinite retention
-1           >0	        Based on the size limit
>0           -1	        Based on the time limit
 0	          0	        Disable message retention (by default)
 0           >0	        Invalid
>0	          0	        Invalid
>0           >0	        Acknowledged messages or messages with no active subscription will not be
                        retained when either time or size reaches the limit.
*/
const xor = (a: boolean, b: boolean) => (a || b) && !(a && b);

const policy = 'retention';

const bytesInMegabyte = 1024 * 1024;
const secondsInMinute = 60;

type PolicyValue =
  {
    type: 'inherited-from-broker-config'
  } | {
    type: 'disabled'
  } | {
    type: 'retain-infinitely'
  } | {
    type: 'specified',
    retentionTimeInMinutes:
    { type: 'infinite' } |
    { type: 'limit', value: number },
    retentionSizeInMb:
    { type: 'infinite' } |
    { type: 'limit', value: number },
  }

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const [key, setKey] = useState(0);
  const { namespaceServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig()
  const [validationError, setValidationError] = useState<ValidationError>(undefined);

  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: initialValue, error: initialValueError } = useSWR(
    swrKey,
    async () => {
      const req = new pb.GetRetentionRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);

      const res = await namespaceServiceClient.getRetention(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get retention policy: ${res.getStatus()?.getMessage()}`);
        return;
      }

      let initialValue: PolicyValue = { type: 'inherited-from-broker-config' };
      switch (res.getRetentionCase()) {
        case pb.GetRetentionResponse.RetentionCase.UNSPECIFIED: {
          initialValue = { type: 'inherited-from-broker-config' };
          break;
        }
        case pb.GetRetentionResponse.RetentionCase.SPECIFIED: {
          const retentionPb = res.getSpecified()!;

          if (retentionPb.getRetentionSizeInMb() === 0 || retentionPb.getRetentionTimeInMinutes() === 0) {
            initialValue = { type: 'disabled' };
            break;
          }

          if (retentionPb.getRetentionSizeInMb() === -1 && retentionPb.getRetentionTimeInMinutes() === -1) {
            initialValue = { type: 'retain-infinitely' };
            break;
          }

          initialValue = {
            type: 'specified',

            retentionSizeInMb: retentionPb.getRetentionSizeInMb() === -1 ?
              { type: 'infinite' } :
              { type: 'limit', value: retentionPb.getRetentionSizeInMb() },
            retentionTimeInMinutes: retentionPb.getRetentionTimeInMinutes() === -1 ?
              { type: 'infinite' } :
              { type: 'limit', value: retentionPb.getRetentionTimeInMinutes() || 0 },
          }
          break;
        }
      }

      return initialValue;
    }
  );

  if (initialValueError) {
    notifyError(`Unable to get retention. ${initialValueError}`);
  }

  if (initialValue === undefined) {
    return <></>;
  }

  return (
    <WithUpdateConfirmation<PolicyValue>
      key={key}
      initialValue={initialValue}
      validationError={validationError}
      onConfirm={async (value) => {
        if (value.type === 'inherited-from-broker-config') {
          const req = new pb.RemoveRetentionRequest();
          req.setNamespace(`${props.tenant}/${props.namespace}`);

          const res = await namespaceServiceClient.removeRetention(req, {});
          if (res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set retention policy: ${res.getStatus()?.getMessage()}`);
            return;
          }
        }

        if (value.type === 'disabled') {
          const req = new pb.SetRetentionRequest();
          req.setNamespace(`${props.tenant}/${props.namespace}`);
          req.setRetentionSizeInMb(0);
          req.setRetentionTimeInMinutes(0);

          const res = await namespaceServiceClient.setRetention(req, {});
          if (res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set retention policy: ${res.getStatus()?.getMessage()}`);
          }
        }

        if (value.type === 'retain-infinitely') {
          const req = new pb.SetRetentionRequest();
          req.setNamespace(`${props.tenant}/${props.namespace}`);
          req.setRetentionSizeInMb(-1);
          req.setRetentionTimeInMinutes(-1);

          const res = await namespaceServiceClient.setRetention(req, {});
          if (res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set retention policy: ${res.getStatus()?.getMessage()}`);
          }
        }

        if (value.type === 'specified') {
          const req = new pb.SetRetentionRequest();
          req.setNamespace(`${props.tenant}/${props.namespace}`);

          if (value.retentionSizeInMb.type === 'infinite') {
            req.setRetentionSizeInMb(-1);
          } else {
            req.setRetentionSizeInMb(Math.max(Math.floor(value.retentionSizeInMb.value), 1));
          }

          if (value.retentionTimeInMinutes.type === 'infinite') {
            req.setRetentionTimeInMinutes(-1);
          } else {
            req.setRetentionTimeInMinutes(Math.max(Math.floor(value.retentionTimeInMinutes.value), 1));
          }

          const res = await namespaceServiceClient.setRetention(req, {});
          if (res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set retention policy: ${res.getStatus()?.getMessage()}`);
          }
        }

        await mutate(swrKey);
        setKey(key + 1);
      }}
    >
      {({ value, onChange: _onChange }) => {
        const validate = (value: PolicyValue): void => {
          if (value.type === 'specified') {
            const sizeIsZero = value.retentionSizeInMb.type === 'limit' && value.retentionSizeInMb.value === 0;
            const timeIsZero = value.retentionTimeInMinutes.type === 'limit' && value.retentionTimeInMinutes.value === 0;

            if (xor(sizeIsZero, timeIsZero)) {
              setValidationError(<div className={sf.ValidationError}>Setting a single time or size limit to 0 is invalid when one of the limits has a non-zero value.</div>)
              return;
            }
          }

          setValidationError(undefined);
        }

        const onChange = (value: PolicyValue): void => {
          validate(value);
          _onChange(value);
        }

        return (
          <>
            <div className={sf.FormItem}>
              <Select<PolicyValue['type']>
                value={value.type}
                list={[
                  { type: 'item', value: 'inherited-from-broker-config', title: 'Inherited from broker config' },
                  { type: 'item', value: 'disabled', title: `Disabled` },
                  { type: 'item', value: `retain-infinitely`, title: `Retain infinitely` },
                  { type: 'item', value: `specified`, title: `Custom` },
                ]}
                onChange={(v) => {
                  switch (v) {
                    case 'inherited-from-broker-config': onChange({ type: 'inherited-from-broker-config' }); break;
                    case `retain-infinitely`: onChange({ type: `retain-infinitely` }); break;
                    case `disabled`: onChange({ type: `disabled` }); break;
                    case `specified`: {
                      onChange({
                        type: `specified`,
                        retentionSizeInMb: { type: 'limit', value: 1 },
                        retentionTimeInMinutes: { type: 'limit', value: 1 },
                      }); break;
                    }
                  }
                }}
              />
            </div>

            {value.type === 'specified' && (
              <>
                <div className={sf.FormItem}>
                  <div className={sf.FormLabel}>Retention time (rounded to minutes)</div>
                  <div className={sf.FormItem}>
                    <Select<(typeof value)['retentionTimeInMinutes']['type']>
                      list={[
                        { type: 'item', value: 'infinite', title: 'Infinite' },
                        { type: 'item', value: 'limit', title: 'Limit' },
                      ]}
                      value={value.retentionTimeInMinutes.type}
                      onChange={(v) => {
                        switch (v) {
                          case 'infinite': onChange({ ...value, retentionTimeInMinutes: { type: 'infinite' } }); break;
                          case 'limit': onChange({ ...value, retentionTimeInMinutes: { type: 'limit', value: 1 } }); break;
                        }
                      }}
                    />
                  </div>

                  {value.retentionTimeInMinutes.type === 'limit' && (
                    <div className={sf.FormItem}>
                      <DurationInput
                        initialValue={value.retentionTimeInMinutes.value * secondsInMinute}
                        onChange={(v) => {
                          onChange({ ...value, retentionTimeInMinutes: { type: 'limit', value: v / secondsInMinute } });
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className={sf.FormItem}>
                  <div className={sf.FormLabel}>Retention size (rounded to MB)</div>
                  <div className={sf.FormItem}>
                    <Select<(typeof value)['retentionSizeInMb']['type']>
                      list={[
                        { type: 'item', value: 'infinite', title: 'Infinite' },
                        { type: 'item', value: 'limit', title: 'Limit' },
                      ]}
                      onChange={(v) => {
                        switch (v) {
                          case 'infinite': onChange({ ...value, retentionSizeInMb: { type: 'infinite' } }); break;
                          case 'limit': onChange({ ...value, retentionSizeInMb: { type: 'limit', value: 1 } }); break;
                        }
                      }}
                      value={value.retentionSizeInMb.type}
                    />
                  </div>
                  {value.retentionSizeInMb.type === 'limit' && (
                    <div className={sf.FormItem}>
                      <MemorySizeInput
                        initialValue={value.retentionSizeInMb.value * bytesInMegabyte}
                        onChange={(v) => {
                          onChange({ ...value, retentionSizeInMb: { type: 'limit', value: v / bytesInMegabyte } });
                        }}
                      />
                    </div>
                  )}
                </div>
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
  title: 'Retention',
  description: <span>By default, when a Pulsar message arrives at a broker, the message is stored until it has been acknowledged on all subscriptions, at which point it is marked for deletion.<br />You can override this behavior and retain messages that have already been acknowledged on all subscriptions by setting a <A isExternalLink href={"https://pulsar.apache.org/docs/3.0.x/cookbooks-retention-expiry/#retention-policies"}>retention policy</A>.</span>,
  input: <FieldInput {...props} />
});

export default field;
