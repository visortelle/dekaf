import * as Notifications from '../../../contexts/Notifications';
import * as PulsarAdminClient from '../../../contexts/PulsarAdminClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ConfigurationTable/ConfigurationTable";
import SelectInput from '../../../ConfigurationTable/SelectInput/SelectInput';
import sf from '../../../ConfigurationTable/form.module.css';
import { useEffect, useState } from 'react';
import UpdateConfirmation from '../../../ConfigurationTable/UpdateConfirmation/UpdateConfirmation';
import { MemorySize } from '../../../ConfigurationTable/MemorySizeInput/types';
import { bytesToMemorySize, memoryToBytes } from '../../../ConfigurationTable/MemorySizeInput/conversions';
import MemorySizeInput from '../../../ConfigurationTable/MemorySizeInput/MemorySizeInput';
import { swrKeys } from '../../../swrKeys';

const policy = 'compactionThreshold';

type CompactionThreshold = 'disabled' | {
  size: MemorySize;
};

const defaultCompactionThreshold: CompactionThreshold = {
  size: {
    size: 0,
    unit: 'M'
  }
};

type CompactionThresholdInputProps = {
  value: CompactionThreshold;
  onChange: (value: CompactionThreshold) => void;
}

const CompactionThresholdInput: React.FC<CompactionThresholdInputProps> = (props) => {
  const [compactionThreshold, setCompactionThreshold] = useState<CompactionThreshold>(props.value);

  useEffect(() => {
    setCompactionThreshold(() => props.value);
  }, [props.value]);

  const showUpdateConfirmation = JSON.stringify(props.value) !== JSON.stringify(compactionThreshold);

  return (
    <div>
      <div className={sf.FormItem}>
        <SelectInput<'enabled' | 'disabled'>
          list={[{ value: 'disabled', title: 'Disabled' }, { value: 'enabled', title: 'Enabled' }]}
          value={compactionThreshold === 'disabled' ? 'disabled' : 'enabled'}
          onChange={(v) => v === 'disabled' ? setCompactionThreshold('disabled') : setCompactionThreshold(defaultCompactionThreshold)}
        />
      </div>
      {compactionThreshold !== 'disabled' && (
        <MemorySizeInput
          value={compactionThreshold.size}
          onChange={(v) => setCompactionThreshold({ size: v })}
        />
      )}
      {showUpdateConfirmation && (
        <UpdateConfirmation
          onUpdate={() => props.onChange(compactionThreshold)}
          onReset={() => setCompactionThreshold(props.value)}
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
  const { mutate } = useSWRConfig()

  const onUpdateError = (err: string) => notifyError(`Can't update compaction threshold. ${err}`);
  const swrKey = swrKeys.pulsar.tenants.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: compactionThreshold, error: compactionThresholdError } = useSWR(
    swrKey,
    async () => await adminClient.namespaces.getCompactionThreshold(props.tenant, props.namespace)
  );

  if (compactionThresholdError) {
    notifyError(`Unable to get compaction threshold. ${compactionThresholdError}`);
  }

  return (
    <CompactionThresholdInput
      value={compactionThreshold === undefined ? 'disabled' : { size: bytesToMemorySize(compactionThreshold) }}
      onChange={async (v) => {
        if (v === 'disabled') {
          await adminClient.namespaces.deleteCompactionThreshold(props.tenant, props.namespace).catch(onUpdateError);
        } else {
          await adminClient.namespaces.setCompactionThreshold(
            props.tenant,
            props.namespace,
            memoryToBytes(v.size)
          ).catch(onUpdateError);
        }

        await mutate(swrKey);
      }}
    />
  )
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Compaction threshold',
  description: <span>Set compactionThreshold for a namespace.</span>,
  input: <FieldInput {...props} />
});

export default field;
