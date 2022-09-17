import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarAdminClient from '../../../app/contexts/PulsarAdminClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ui/ConfigurationTable/ConfigurationTable";
import SelectInput from '../../../ui/ConfigurationTable/SelectInput/SelectInput';
import sf from '../../../ui/ConfigurationTable/form.module.css';
import { useEffect, useState } from 'react';
import UpdateConfirmation from '../../../ui/ConfigurationTable/UpdateConfirmation/UpdateConfirmation';
import { MemorySize } from '../../../ui/ConfigurationTable/MemorySizeInput/types';
import { bytesToMemorySize, memoryToBytes } from '../../../ui/ConfigurationTable/MemorySizeInput/conversions';
import MemorySizeInput from '../../../ui/ConfigurationTable/MemorySizeInput/MemorySizeInput';
import { swrKeys } from '../../../swrKeys';
import { isEqual } from 'lodash';

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

  const showUpdateConfirmation = !isEqual(props.value, offloadThreshold);

  return (
    <div>
      <div className={sf.FormItem}>
        <SelectInput<'enabled' | 'disabled'>
          list={[{ type: 'item', value: 'disabled', title: 'Disabled' }, { type: 'item', value: 'enabled', title: 'Enabled' }]}
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
          onConfirm={() => props.onChange(offloadThreshold)}
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
  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

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
