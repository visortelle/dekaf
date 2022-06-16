import * as Notifications from '../../../contexts/Notifications';
import * as PulsarAdminClient from '../../../contexts/PulsarAdminClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ConfigurationTable/ConfigurationTable";
import sf from '../../../ConfigurationTable/form.module.css';
import Input from "../../../ConfigurationTable/Input/Input";
import { useEffect, useState } from 'react';
import * as Either from 'fp-ts/Either';
import UpdateConfirmation from '../../../ConfigurationTable/UpdateConfirmation/UpdateConfirmation';
import SelectInput from '../../../ConfigurationTable/SelectInput/SelectInput';
import { swrKeys } from '../../../swrKeys';

const policy = 'persistence';

export type Persistence = 'disabled' | {
  bookkeeperAckQuorum: number;
  bookkeeperEnsemble: number;
  bookkeeperWriteQuorum: number;
  mlMarkDeleteMaxRate: number;
}

const defaultPersistence: Persistence = {
  bookkeeperAckQuorum: 0,
  bookkeeperEnsemble: 0,
  bookkeeperWriteQuorum: 0,
  mlMarkDeleteMaxRate: 0,
};

export type PersistenceInputProps = {
  value: Persistence;
  onChange: (value: Persistence) => void;
};
export const PersistenceInput: React.FC<PersistenceInputProps> = (props) => {
  const [persistence, setPersistence] = useState<Persistence>(props.value);
  const [validationResult, setValidationResult] = useState<Either.Either<React.ReactElement, void>>(Either.right(undefined));

  useEffect(() => {
    setPersistence(() => props.value);
  }, [props.value]);

  useEffect(() => {
    validate(persistence);
  }, [persistence]);

  const validate = (p: Persistence): void => {
    if (p === 'disabled') {
      setValidationResult(() => Either.right(undefined));
      return;
    }

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

  const showUpdateConfirmation = Either.isRight(validationResult) && JSON.stringify(props.value) !== JSON.stringify(persistence);

  return (
    <div>
      <div className={sf.FormItem}>
        <SelectInput<'enabled' | 'disabled'>
          list={[{ value: 'disabled', title: 'Disabled' }, { value: 'enabled', title: 'Enabled' }]}
          value={persistence === 'disabled' ? 'disabled' : 'enabled'}
          onChange={(v) => v === 'disabled' ? setPersistence('disabled') : setPersistence(defaultPersistence)}
        />
      </div>
      {persistence !== 'disabled' && (
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

  const onUpdateError = (err: string) => notifyError(`Can't update persistency policies. ${err}`);
  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: persistence, error: persistenceError } = useSWR(
    swrKey,
    async () => await adminClient.namespaces.getPersistence(props.tenant, props.namespace)
  );

  if (persistenceError) {
    notifyError(`Unable to get persistence policies. ${persistenceError}`);
  }

  return (
    <PersistenceInput
      value={persistence === undefined ? 'disabled' : {
        bookkeeperAckQuorum: persistence.bookkeeperAckQuorum === undefined ? defaultPersistence.bookkeeperAckQuorum : persistence.bookkeeperAckQuorum,
        bookkeeperEnsemble: persistence.bookkeeperEnsemble === undefined ? defaultPersistence.bookkeeperEnsemble : persistence.bookkeeperEnsemble,
        bookkeeperWriteQuorum: persistence.bookkeeperWriteQuorum === undefined ? defaultPersistence.bookkeeperWriteQuorum : persistence.bookkeeperWriteQuorum,
        mlMarkDeleteMaxRate: persistence.managedLedgerMaxMarkDeleteRate === undefined ? defaultPersistence.mlMarkDeleteMaxRate : persistence.managedLedgerMaxMarkDeleteRate,
      }}
      onChange={async (v) => {
        if (v === 'disabled') {
          await adminClient.namespaces.deletePersistence(props.tenant, props.namespace).catch(onUpdateError);
        } else {
          await adminClient.namespaces.setPersistence(
            props.tenant,
            props.namespace,
            {
              bookkeeperEnsemble: v.bookkeeperEnsemble,
              bookkeeperWriteQuorum: v.bookkeeperWriteQuorum,
              bookkeeperAckQuorum: v.bookkeeperAckQuorum,
              managedLedgerMaxMarkDeleteRate: v.mlMarkDeleteMaxRate
            }).catch(onUpdateError);
        }

        await mutate(swrKey);
      }}
    />
  )
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Persistence',
  description: <span>List of clusters that will be used for replication.</span>,
  input: <FieldInput {...props} />
});

export default field;
