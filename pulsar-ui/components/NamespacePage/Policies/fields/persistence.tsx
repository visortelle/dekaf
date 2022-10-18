import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import sf from '../../../ui/ConfigurationTable/form.module.css';
import Input from "../../../ui/ConfigurationTable/Input/Input";
import { useState } from 'react';
import Select from '../../../ui/Select/Select';
import { swrKeys } from '../../../swrKeys';
import WithUpdateConfirmation from '../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';

const policy = 'persistence';

type ValidationResult = React.ReactElement | undefined;

export type PolicyValue =
  { type: 'disabled' } | {
    type: 'enabled',
    bookkeeperAckQuorum: number;
    bookkeeperEnsemble: number;
    bookkeeperWriteQuorum: number;
    managedLedgerMarkDeleteMaxRate: number;
  }

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const { namespaceServiceClient } = PulsarGrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();
  const [validationError, setValidationError] = useState<ValidationResult>(undefined);

  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: initialValue, error: initialValueError } = useSWR(
    swrKey,
    async () => {
      const req = new pb.GetPersistenceRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);
      const res = await namespaceServiceClient.getPersistence(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get persistence policy: ${res.getStatus()?.getMessage()}`);
        return;
      }

      let initialValue: PolicyValue = { type: 'disabled' };
      switch (res.getPersistenceCase()) {
        case pb.GetPersistenceResponse.PersistenceCase.UNSPECIFIED: {
          initialValue = { type: 'disabled' }; break;
        }
        case pb.GetPersistenceResponse.PersistenceCase.SPECIFIED: {
          const v = res.getSpecified();
          if (v === undefined) {
            return;
          }

          initialValue = {
            type: 'enabled',
            bookkeeperAckQuorum: v.getBookkeeperAckQuorum(),
            bookkeeperEnsemble: v.getBookkeeperEnsemble(),
            bookkeeperWriteQuorum: v.getBookkeeperWriteQuorum(),
            managedLedgerMarkDeleteMaxRate: v.getManagedLedgerMaxMarkDeleteRate(),
          }
        }
      }
      return initialValue;
    }
  );

  if (initialValueError) {
    notifyError(`Unable to get persistence policies. ${initialValueError}`);
  }

  if (initialValue === undefined) {
    return null;
  }

  return (
    <WithUpdateConfirmation<PolicyValue>
      initialValue={initialValue}
      onConfirm={async (value) => {
        if (value.type === 'disabled') {
          const req = new pb.RemovePersistenceRequest();
          req.setNamespace(`${props.tenant}/${props.namespace}`);
          const res = await namespaceServiceClient.removePersistence(req, {});
          if (res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to remove persistence policy: ${res.getStatus()?.getMessage()}`);
          }
        }

        if (value.type === 'enabled') {
          const req = new pb.SetPersistenceRequest();
          req.setNamespace(`${props.tenant}/${props.namespace}`);

          req.setBookkeeperAckQuorum(value.bookkeeperAckQuorum);
          req.setBookkeeperEnsemble(value.bookkeeperEnsemble);
          req.setBookkeeperWriteQuorum(value.bookkeeperWriteQuorum);
          req.setManagedLedgerMaxMarkDeleteRate(value.managedLedgerMarkDeleteMaxRate);

          const res = await namespaceServiceClient.setPersistence(req, {});
          if (res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set persistence policy: ${res.getStatus()?.getMessage()}`);
          }
        }

        mutate(swrKey);
      }}
      validationError={validationError}
    >
      {({ value, onChange: _onChange }) => {
        const validate = (v: PolicyValue): ValidationResult => {
          if (v.type !== 'enabled') {
            return undefined;
          }

          // Source: https://github.com/apache/pulsar/blob/6734a3bf77793419898dd1c8421da039dc117f6e/pulsar-broker/src/main/java/org/apache/pulsar/broker/admin/AdminResource.java#L812
          const isValid = (
            (v.bookkeeperEnsemble >= v.bookkeeperWriteQuorum) &&
            (v.bookkeeperWriteQuorum >= v.bookkeeperAckQuorum)
          );

          const validationError = isValid ? undefined : (
            <div style={{ color: `var(--accent-color-red)`, marginBottom: '12rem' }}>
              <span><strong>Ensemble</strong> must be &gt;= <strong>Write quorum</strong>.</span>
              <br />
              <span><strong>Write quorum</strong> must be &gt;= <strong>Ack quorum</strong>.</span>
            </div>
          );

          setValidationError(validationError);
        }

        const onChange = (value: PolicyValue) => {
          _onChange(value);
          validate(value);
        }

        return (
          <>
            <div className={sf.FormItem}>
              <Select<PolicyValue['type']>
                list={[
                  { type: 'item', value: 'disabled', title: 'Disabled' },
                  { type: 'item', value: 'enabled', title: 'Enabled' }
                ]}
                value={value.type}
                onChange={v => {
                  onChange(v === 'disabled' ?
                    { type: 'disabled' } :
                    {
                      type: 'enabled',
                      bookkeeperAckQuorum: 0,
                      bookkeeperEnsemble: 0,
                      bookkeeperWriteQuorum: 0,
                      managedLedgerMarkDeleteMaxRate: 0
                    });
                }}
              />
            </div>
            {value.type === 'enabled' && (
              <div>
                <div className={sf.FormItem}>
                  <strong className={sf.FormLabel}>Ensemble</strong>
                  <Input
                    type='number'
                    onChange={(v) => onChange({ ...value, bookkeeperEnsemble: Number(v) })}
                    value={String(value.bookkeeperEnsemble)}
                  />
                </div>

                <div className={sf.FormItem}>
                  <strong className={sf.FormLabel}>Write quorum</strong>
                  <Input
                    type='number'
                    onChange={(v) => onChange({ ...value, bookkeeperWriteQuorum: Number(v) })}
                    value={String(value.bookkeeperWriteQuorum)}
                  />
                </div>

                <div className={sf.FormItem}>
                  <strong className={sf.FormLabel}>Ack quorum</strong>
                  <Input
                    type='number'
                    onChange={(v) => onChange({ ...value, bookkeeperAckQuorum: Number(v) })}
                    value={String(value.bookkeeperAckQuorum)}
                  />
                </div>

                <div className={sf.FormItem}>
                  <strong className={sf.FormLabel}>Mark delete max rate</strong>
                  <Input
                    type='number'
                    onChange={(v) => onChange({ ...value, managedLedgerMarkDeleteMaxRate: Number(v) })}
                    value={String(value.managedLedgerMarkDeleteMaxRate)}
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
  title: 'Persistence',
  description: <span>List of clusters that will be used for replication.</span>,
  input: <FieldInput {...props} />
});

export default field;
