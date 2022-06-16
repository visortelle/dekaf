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

const policy = 'offloadThreshold';

type OffloadThreshold = 'disabled' | {
  size: MemorySize;
};

const defaultOffloadThreshold: OffloadThreshold = {
  size: {
    size: 0,
    unit: 'M'
  }
};

type OffloadThresholdInputProps = {
  value: OffloadThreshold;
  onChange: (value: OffloadThreshold) => void;
}

const OffloadThresholdInput: React.FC<OffloadThresholdInputProps> = (props) => {
  const [offloadThreshold, setOffloadThreshold] = useState<OffloadThreshold>(props.value);

  useEffect(() => {
    setOffloadThreshold(() => props.value);
  }, [props.value]);

  const showUpdateConfirmation = JSON.stringify(props.value) !== JSON.stringify(offloadThreshold);

  return (
    <div>
      <div className={sf.FormItem}>
        <SelectInput<'enabled' | 'disabled'>
          list={[{ value: 'disabled', title: 'Disabled' }, { value: 'enabled', title: 'Enabled' }]}
          value={offloadThreshold === 'disabled' ? 'disabled' : 'enabled'}
          onChange={(v) => v === 'disabled' ? setOffloadThreshold('disabled') : setOffloadThreshold(defaultOffloadThreshold)}
        />
      </div>
      {offloadThreshold !== 'disabled' && (
        <MemorySizeInput
          value={offloadThreshold.size}
          onChange={(v) => setOffloadThreshold({ size: v })}
        />
      )}
      {showUpdateConfirmation && (
        <UpdateConfirmation
          onUpdate={() => props.onChange(offloadThreshold)}
          onReset={() => setOffloadThreshold(props.value)}
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

  const onUpdateError = (err: string) => notifyError(`Can't update offload threshold. ${err}`);
  const swrKey = swrKeys.pulsar.tenants.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: offloadThreshold, error: offloadThresholdError } = useSWR(
    swrKey,
    async () => await adminClient.namespaces.getOffloadThreshold(props.tenant, props.namespace)
  );

  if (offloadThresholdError) {
    notifyError(`Unable to get offload threshold. ${offloadThresholdError}`);
  }

  return (
    <OffloadThresholdInput
      value={(offloadThreshold === undefined || offloadThreshold < 0) ? 'disabled' : { size: bytesToMemorySize(offloadThreshold) }}
      onChange={async (v) => {
        if (v === 'disabled') {
          await adminClient.namespaces.setOffloadThreshold(props.tenant, props.namespace, -1).catch(onUpdateError);
        } else {
          await adminClient.namespaces.setOffloadThreshold(
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
  title: 'Offload threshold',
  description: <span>Maximum number of bytes stored in the pulsar cluster for a topic before data will start being automatically offloaded to long-term storage. 0 triggers offloading as soon as possible.</span>,
  input: <FieldInput {...props} />
});

export default field;
