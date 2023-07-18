import { useState } from 'react';
import useSWR, { useSWRConfig } from "swr";
import stringify from "safe-stable-stringify";

import * as Notifications from '../../../app/contexts/Notifications';
import * as GrpcClient from '../../../app/contexts/GrpcClient/GrpcClient';
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import sf from '../../../ui/ConfigurationTable/form.module.css';
import Input from "../../../ui/ConfigurationTable/Input/Input";
import Select from '../../../ui/Select/Select';
import WithUpdateConfirmation, { ValidationError } from '../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import * as pb from "../../../../grpc-web/tools/teal/pulsar/ui/topicpolicies/v1/topicpolicies_pb";
import { swrKeys } from '../../../swrKeys';

const policy = 'persistence';

export type PolicyValue =
  { type: 'inherited-from-namespace-config' } | {
    type: 'specified-for-this-topic',
    bookkeeperAckQuorum: number;
    bookkeeperEnsemble: number;
    bookkeeperWriteQuorum: number;
    managedLedgerMarkDeleteMaxRate: number;
  }

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
  const [validationError, setValidationError] = useState<ValidationError>(undefined);

  const swrKey = props.topicType === 'persistent' ?
    swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy, isGlobal: props.isGlobal }) :
    swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy, isGlobal: props.isGlobal });

  const { data: initialValue, error: initialValueError } = useSWR(
    swrKey,
    async () => {
      const req = new pb.GetPersistenceRequest();
      req.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
      req.setIsGlobal(props.isGlobal);

      const res = await topicPoliciesServiceClient.getPersistence(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get persistence policy: ${res.getStatus()?.getMessage()}`);
        return;
      }

      let initialValue: PolicyValue = { type: 'inherited-from-namespace-config' };
      switch (res.getPersistenceCase()) {
        case pb.GetPersistenceResponse.PersistenceCase.UNSPECIFIED: {
          initialValue = { type: 'inherited-from-namespace-config' }; break;
        }
        case pb.GetPersistenceResponse.PersistenceCase.SPECIFIED: {
          const v = res.getSpecified();
          if (v === undefined) {
            return;
          }

          initialValue = {
            type: 'specified-for-this-topic',
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

  const updatePolicy = async (value: PolicyValue) => {
    if (value.type === 'inherited-from-namespace-config') {
      const req = new pb.RemovePersistenceRequest();
      req.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
      req.setIsGlobal(props.isGlobal);

      const res = await topicPoliciesServiceClient.removePersistence(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to set persistence policy: ${res.getStatus()?.getMessage()}`);
      }
    }

    if (value.type === 'specified-for-this-topic') {
      const req = new pb.SetPersistenceRequest();
      req.setTopic(`${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`);
      req.setIsGlobal(props.isGlobal);

      req.setBookkeeperAckQuorum(value.bookkeeperAckQuorum);
      req.setBookkeeperEnsemble(value.bookkeeperEnsemble);
      req.setBookkeeperWriteQuorum(value.bookkeeperWriteQuorum);
      req.setManagedLedgerMaxMarkDeleteRate(value.managedLedgerMarkDeleteMaxRate);

      const res = await topicPoliciesServiceClient.setPersistence(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to set persistence policy: ${res.getStatus()?.getMessage()}`);
      }
    }

    setTimeout(async () => {
      await mutate(swrKey);
    }, 300);
  }

  return (
    <WithUpdateConfirmation<PolicyValue>
      key={stringify(initialValue)}
      initialValue={initialValue}
      onConfirm={updatePolicy}
      validationError={validationError}
    >
      {({ value, onChange: _onChange }) => {
        const validate = (v: PolicyValue): ValidationError => {
          if (v.type !== 'specified-for-this-topic') {
            return undefined;
          }

          const isValid = (
            (v.bookkeeperEnsemble >= v.bookkeeperWriteQuorum) &&
            (v.bookkeeperWriteQuorum >= v.bookkeeperAckQuorum)
          );

          const validationError = isValid ? undefined : (
            <div className={sf.ValidationError} style={{ marginBottom: '12rem' }}>
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
                  { type: 'item', value: 'inherited-from-namespace-config', title: 'Inherited from namespace config' },
                  { type: 'item', value: 'specified-for-this-topic', title: 'Specified for this topic' }
                ]}
                value={value.type}
                onChange={v => {
                  onChange(v === 'inherited-from-namespace-config' ?
                    { type: 'inherited-from-namespace-config' } :
                    {
                      type: 'specified-for-this-topic',
                      bookkeeperAckQuorum: 0,
                      bookkeeperEnsemble: 0,
                      bookkeeperWriteQuorum: 0,
                      managedLedgerMarkDeleteMaxRate: 0
                    });
                }}
              />
            </div>
            {value.type === 'specified-for-this-topic' && (
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
  description: <div>Determines how BookKeeper handles persistent storage of messages. Policies determine four things:
    <ul>
      <li>
        Ensemble (E) size: number of bookies to use for storing entries in a ledger.
      </li>
      <li>
        Write quorum (Q<sub>w</sub>) size: replication factor for storing entries (messages) in a ledger.
      </li>
      <li>
        Ack quorum (Q<sub>a</sub>) size: number of guaranteed copies (acks to wait for before a write is considered completed).
      </li>
      <li>
        The throttling rate for mark-delete operations.
      </li>
    </ul>
  </div>,
  input: <FieldInput {...props} />
});

export default field;
