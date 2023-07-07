import * as Notifications from '../../../app/contexts/Notifications';
import * as GrpcClient from '../../../app/contexts/GrpcClient/GrpcClient';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import sf from '../../../ui/ConfigurationTable/form.module.css';
import Input from "../../../ui/ConfigurationTable/Input/Input";
import React, { useState } from 'react';
import Select from '../../../ui/Select/Select';
import { swrKeys } from '../../../swrKeys';
import WithUpdateConfirmation, { ValidationError } from '../../../ui/ConfigurationTable/UpdateConfirmation/WithUpdateConfirmation';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import A from "../../../ui/A/A";
import TooltipLink from "../../../ui/TooltipLink/TooltipLink";

const policy = 'persistence';

export type PolicyValue =
  { type: 'inherited-from-broker-config' } | {
    type: 'specified-for-this-namespace',
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
  const { namespaceServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();
  const [validationError, setValidationError] = useState<ValidationError>(undefined);

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

      let initialValue: PolicyValue = { type: 'inherited-from-broker-config' };
      switch (res.getPersistenceCase()) {
        case pb.GetPersistenceResponse.PersistenceCase.UNSPECIFIED: {
          initialValue = { type: 'inherited-from-broker-config' }; break;
        }
        case pb.GetPersistenceResponse.PersistenceCase.SPECIFIED: {
          const v = res.getSpecified();
          if (v === undefined) {
            return;
          }

          initialValue = {
            type: 'specified-for-this-namespace',
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
        if (value.type === 'inherited-from-broker-config') {
          const req = new pb.RemovePersistenceRequest();
          req.setNamespace(`${props.tenant}/${props.namespace}`);
          const res = await namespaceServiceClient.removePersistence(req, {});
          if (res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to set persistence policy: ${res.getStatus()?.getMessage()}`);
          }
        }

        if (value.type === 'specified-for-this-namespace') {
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
        const validate = (v: PolicyValue): ValidationError => {
          if (v.type !== 'specified-for-this-namespace') {
            return undefined;
          }

          // Source: https://github.com/apache/pulsar/blob/6734a3bf77793419898dd1c8421da039dc117f6e/pulsar-broker/src/main/java/org/apache/pulsar/broker/admin/AdminResource.java#L812
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
                  { type: 'item', value: 'inherited-from-broker-config', title: 'Inherited from broker config' },
                  { type: 'item', value: 'specified-for-this-namespace', title: 'Specified for this namespace' }
                ]}
                value={value.type}
                onChange={v => {
                  onChange(v === 'inherited-from-broker-config' ?
                    { type: 'inherited-from-broker-config' } :
                    {
                      type: 'specified-for-this-namespace',
                      bookkeeperAckQuorum: 0,
                      bookkeeperEnsemble: 0,
                      bookkeeperWriteQuorum: 0,
                      managedLedgerMarkDeleteMaxRate: 0
                    });
                }}
              />
            </div>
            {value.type === 'specified-for-this-namespace' && (
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

export type TermKey =
  'ledger' |
  'persistent storage' |
  'bookie' |
  'message' |
  'acknowledgement' |
  'throttling-rate-mark-delete';

export const help: Record<TermKey, React.ReactNode> = {
  ledger: <div>An append-only data structure in BookKeeper that is used to persistently store messages in Pulsar topics. It is used by a Pulsar broker to create and append entries(messages), and once closed, it becomes read-only. The ledger can be deleted when its entries are no longer required.</div>,
  "persistent storage": <div>Mechanism that ensures message delivery by retaining non-acknowledged messages until they are delivered to and acknowledged by consumers.</div>,
  bookie: <div>Bookie is the name of an individual BookKeeper server. It is effectively the storage server of Pulsar.</div>,
  message: <div>Messages are the basic unit of Pulsar. They're what producers publish to topics and what consumers then consume from topics.</div>,
  acknowledgement: <div>A message sent to a Pulsar broker by a consumer that a message has been successfully processed and it can be deleted from the system.</div>,
  "throttling-rate-mark-delete": <div>Refers to the maximum rate at which acknowledgements (mark-delete operations) can be processed by the broker. This is a form of rate limiting that can be used to prevent overloading the system with too many acknowledgement operations in a short period of time.</div>
}
const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Persistence',
  description: <div>Determines how BookKeeper handles <TooltipLink tooltipHelp={help["persistent storage"]} link="https://pulsar.apache.org/docs/3.0.x/concepts-architecture-overview/#persistent-storage">persistent storage</TooltipLink> of messages. Policies determine four things:
    <ul>
      <li>
        The ensemble size (E): number of  <TooltipLink tooltipHelp={help["bookie"]} link="https://pulsar.apache.org/docs/3.0.x/reference-terminology/#storage">bookies</TooltipLink> the <TooltipLink tooltipHelp={help["ledger"]} link="https://pulsar.apache.org/docs/3.0.x/concepts-architecture-overview/#ledgers">ledger</TooltipLink> will be stored on.
      </li>
      <li>
        The quorum write size (Q<sub>w</sub>): number of bookies each <TooltipLink tooltipHelp={help["message"]} link="https://pulsar.apache.org/docs/3.0.x/concepts-messaging/#messages">entry (message)</TooltipLink> will be written to.
      </li>
      <li>
        <TooltipLink tooltipHelp={help["acknowledgement"]} link="https://pulsar.apache.org/docs/3.0.x/reference-terminology/#acknowledgment-ack">Acknowledgment(ack)</TooltipLink> quorum (Q<sub>a</sub>) size: number of nodes an entry must be acknowledged by (number of guaranteed copies).
      </li>
      <li>
        The <TooltipLink tooltipHelp={help["throttling-rate-mark-delete"]} link="https://streamnative.io/blog/deep-dive-into-topic-data-lifecycle-apache-pulsar">throttling rate for mark-delete operations</TooltipLink>.
      </li>
    </ul>
  </div>,
  input: <FieldInput {...props} />
});
export default field;
