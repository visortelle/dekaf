import * as Notifications from '../../../contexts/Notifications';
import * as PulsarAdminClient from '../../../contexts/PulsarAdminClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ConfigurationTable/ConfigurationTable";
import sf from '../../../ConfigurationTable/form.module.css';
import Input from "../../../ConfigurationTable/Input/Input";
import { useEffect, useState } from 'react';
import UpdateConfirmation from '../../../ConfigurationTable/UpdateConfirmation/UpdateConfirmation';
import SelectInput from '../../../ConfigurationTable/SelectInput/SelectInput';

const policyId = 'autoTopicCreation';

const minNumPartitions = 1;

export type AutoTopicCreation = {
  enabled: 'true' | 'false';
  numPartitions: number;
  type: 'partitioned' | 'non-partitioned';
}

export type AutoTopicCreationInputProps = {
  value: AutoTopicCreation;
  onChange: (value: AutoTopicCreation) => void;
};
export const AutoTopicCreationInput: React.FC<AutoTopicCreationInputProps> = (props) => {
  const [autoTopicCreation, setAutoTopicCreation] = useState<AutoTopicCreation>(props.value);

  useEffect(() => {
    setAutoTopicCreation(() => props.value);
  }, [props.value]);

  const showUpdateConfirmation = JSON.stringify(props.value) !== JSON.stringify(autoTopicCreation);

  return (
    <div>
      <div className={sf.FormItem}>
        <strong className={sf.FormLabel}>Enable</strong>
        <SelectInput<AutoTopicCreation['enabled']>
          onChange={(v) => setAutoTopicCreation({ ...autoTopicCreation, enabled: v })}
          value={autoTopicCreation.enabled}
          list={[{ value: 'false', title: 'False' }, { value: 'true', title: 'True' }]}
        />
      </div>

      {autoTopicCreation.enabled === 'true' && (
        <div className={sf.FormItem}>
          <strong className={sf.FormLabel}>Type</strong>
          <SelectInput<AutoTopicCreation['type']>
            onChange={(v) => setAutoTopicCreation({ ...autoTopicCreation, type: v })}
            value={autoTopicCreation.type}
            list={[{ value: 'partitioned', title: 'Partitioned' }, { value: 'non-partitioned', title: 'Non-partitioned' }]}
          />
        </div>
      )}

      {autoTopicCreation.enabled === 'true' && autoTopicCreation.type === 'partitioned' && (
        <div className={sf.FormItem}>
          <strong className={sf.FormLabel}>Num partitions</strong>
          <Input
            type='number'
            onChange={(v) => {
              const int = parseInt(v, 10);
              const n = int < minNumPartitions ? minNumPartitions : int;

              setAutoTopicCreation({ ...autoTopicCreation, numPartitions: n });
            }}
            value={String(autoTopicCreation.numPartitions)}
            inputProps={{ min: 1 }}
          />
        </div>
      )
      }

      {showUpdateConfirmation && (
        <UpdateConfirmation
          onUpdate={() => props.onChange(autoTopicCreation)}
          onReset={() => setAutoTopicCreation(props.value)}
        />
      )}
    </div>
  );
}

// XXX - Missing response type in swagger definitions for this endpoint.
type AutoTopicCreationData = {
  allowAutoTopicCreation: boolean,
  topicType: 'partitioned' | 'non-partitioned',
  defaultNumPartitions: number
}

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const adminClient = PulsarAdminClient.useContext().client;
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig();

  const onUpdateError = (err: string) => notifyError(`Can't update auto topic creation. ${err}`);
  const swrKey = ['pulsar', 'tenants', props.tenant, 'namespaces', props.namespace, 'policies', policyId];

  const { data: autoTopicCreationData, error: persistenceError } = useSWR(
    swrKey,
    async () => (await adminClient.namespaces.getAutoTopicCreation(props.tenant, props.namespace)) as unknown as AutoTopicCreationData,
  );

  if (persistenceError) {
    notifyError(`Unable to get persistence policies. ${persistenceError}`);
  }

  const autoTopicCreation: AutoTopicCreation = {
    enabled: autoTopicCreationData?.allowAutoTopicCreation ? 'true' : 'false',
    numPartitions: autoTopicCreationData?.defaultNumPartitions || minNumPartitions,
    type: autoTopicCreationData?.topicType || 'non-partitioned',
  }

  return (
    <AutoTopicCreationInput
      value={autoTopicCreation}
      onChange={async (value) => {
        await adminClient.namespaces.setAutoTopicCreation(
          props.tenant,
          props.namespace,
          {
            allowAutoTopicCreation: value.enabled === 'true',
            topicType: value.enabled === 'true' ? value.type : undefined,
            defaultNumPartitions: (value.enabled === 'true' && value.type === 'partitioned') ? value.numPartitions : undefined,
          }).catch(onUpdateError);
        await mutate(swrKey);
      }}
    />
  )
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policyId,
  title: 'Auto topic creation',
  description: <span>Enable or disable autoTopicCreation for a namespace, overriding broker settings.</span>,
  input: <FieldInput {...props} />
});

export default field;
