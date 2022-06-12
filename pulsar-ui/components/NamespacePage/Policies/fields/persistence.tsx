import * as Notifications from '../../../contexts/Notifications';
import * as PulsarAdminClient from '../../../contexts/PulsarAdminClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ConfigurationTable/ConfigurationTable";
import sf from '../../../ConfigurationTable/form.module.css';
import Input from "../../../ConfigurationTable/Input/Input";
import { useEffect, useState } from 'react';
import * as Either from 'fp-ts/Either';
import UpdateConfirmation from '../../../ConfigurationTable/UpdateConfirmation/UpdateConfirmation';

const policyId = 'persistence';

export type Persistence = {
  bookkeeperAckQuorum: number;
  bookkeeperEnsemble: number;
  bookkeeperWriteQuorum: number;
  mlMarkDeleteMaxRate: number;
}

export type PersistenceInputProps = {
  value: Persistence;
  onChange: (value: Persistence) => void;
};
export const PersistenceInput: React.FC<PersistenceInputProps> = (props) => {
  const [persistence, setPersistence] = useState<Persistence>(props.value);
  const [validationResult, setValidationResult] = useState<Either.Either<React.ReactElement, void>>(Either.right(undefined));

  const validate = (p: Persistence): void => {
    // Source: https://github.com/apache/pulsar/blob/6734a3bf77793419898dd1c8421da039dc117f6e/pulsar-broker/src/main/java/org/apache/pulsar/broker/admin/AdminResource.java#L812
    const isValid = (
      (p.bookkeeperEnsemble >= p.bookkeeperWriteQuorum) &&
      (p.bookkeeperWriteQuorum >= p.bookkeeperAckQuorum)
    );

    if (!isValid) {
      setValidationResult(() =>
        Either.left(
          <div style={{ color: `var(--accent-color-red)`, marginBottom: '12rem' }}>
            <span><strong>Ensemble</strong> must be &gt;= <strong>Write quorum</strong>.</span>
            <br />
            <span><strong>Write quorum</strong> must be &gt;= <strong>Ack quorum</strong>.</span>
          </div>
        )
      );
      return;
    }

    setValidationResult(() => Either.right(undefined));
  }

  useEffect(() => {
    setPersistence(() => props.value);
  }, [props.value]);

  useEffect(() => {
    validate(persistence);
  }, [persistence]);

  const showUpdateConfirmation = Either.isRight(validationResult) && JSON.stringify(props.value) !== JSON.stringify(persistence);

  return (
    <div>
      <div className={sf.FormItem}>
        <strong className={sf.FormLabel}>Ensemble</strong>
        <Input
          type='number'
          onChange={(v) => setPersistence({ ...persistence, bookkeeperEnsemble: Number(v) })}
          value={String(persistence.bookkeeperEnsemble)}
        />
      </div>

      <div className={sf.FormItem}>
        <strong className={sf.FormLabel}>Write quorum</strong>
        <Input
          type='number'
          onChange={(v) => setPersistence({ ...persistence, bookkeeperWriteQuorum: Number(v) })}
          value={String(persistence.bookkeeperWriteQuorum)}
        />
      </div>

      <div className={sf.FormItem}>
        <strong className={sf.FormLabel}>Ack quorum</strong>
        <Input
          type='number'
          onChange={(v) => setPersistence({ ...persistence, bookkeeperAckQuorum: Number(v) })}
          value={String(persistence.bookkeeperAckQuorum)}
        />
      </div>

      <div className={sf.FormItem}>
        <strong className={sf.FormLabel}>Mark delete max rate</strong>
        <Input
          type='number'
          onChange={(v) => setPersistence({ ...persistence, mlMarkDeleteMaxRate: Number(v) })}
          value={String(persistence.mlMarkDeleteMaxRate)}
        />
      </div>

      {Either.isLeft(validationResult) && (
        <div>
          {validationResult.left}
        </div>
      )}

      {showUpdateConfirmation && (
        <UpdateConfirmation
          onUpdate={() => props.onChange(persistence)}
          onReset={() => setPersistence(props.value)}
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

  const onUpdateError = (err: string) => notifyError(`Can't update persistency policies. ${err} \nNOTE: Probably max limits configured by Pulsar administrator.`);
  const swrKey = ['pulsar', 'tenants', props.tenant, 'namespaces', props.namespace, 'policies', policyId];

  const { data: persistence, error: persistenceError } = useSWR(
    swrKey,
    async () => await adminClient.namespaces.getPersistence(props.tenant, props.namespace)
  );

  if (persistenceError) {
    notifyError(`Unable to get persistence policies. ${persistenceError}`);
  }

  return (
    <PersistenceInput
      value={{
        bookkeeperAckQuorum: persistence?.bookkeeperAckQuorum || 0,
        bookkeeperEnsemble: persistence?.bookkeeperEnsemble || 0,
        bookkeeperWriteQuorum: persistence?.bookkeeperWriteQuorum || 0,
        mlMarkDeleteMaxRate: persistence?.managedLedgerMaxMarkDeleteRate || 0,
      }}
      onChange={async (value) => {
        await adminClient.namespaces.setPersistence(
          props.tenant,
          props.namespace,
          {
            bookkeeperEnsemble: value.bookkeeperEnsemble,
            bookkeeperWriteQuorum: value.bookkeeperWriteQuorum,
            bookkeeperAckQuorum: value.bookkeeperAckQuorum,
            managedLedgerMaxMarkDeleteRate: value.mlMarkDeleteMaxRate
          }).catch(onUpdateError);
        await mutate(swrKey);
      }}
    />
  )
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policyId,
  title: 'Persistence',
  description: <span>List of clusters that will be used for replication.</span>,
  input: <FieldInput {...props} />
});

export default field;
