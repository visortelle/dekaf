import SelectInput from "../../../ConfigurationTable/SelectInput/SelectInput";
import * as Notifications from '../../../contexts/Notifications';
import * as PulsarAdminClient from '../../../contexts/PulsarAdminClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ConfigurationTable/ConfigurationTable";
import sf from '../../../ConfigurationTable/form.module.css';
import DurationInput from "../../../ConfigurationTable/DurationInput/DurationInput";
import { secondsToDuration, durationToSeconds } from "../../../ConfigurationTable/DurationInput/conversions";
import UpdateConfirmation from "../../../ConfigurationTable/UpdateConfirmation/UpdateConfirmation";
import { useEffect, useState } from "react";
import { Duration } from "../../../ConfigurationTable/DurationInput/types";

const policyId = 'inactiveTopicPolicies';

type DeleteMode = 'delete_when_no_subscriptions' | 'delete_when_subscriptions_caught_up';
type EnableWhileDeleteInactive = boolean;

type Policies = 'disabled' | {
  deleteMode: DeleteMode,
  enableDeleteWhileInactive: EnableWhileDeleteInactive,
  maxInactiveDuration: Duration;
}

const defaultPolicies: Policies = {
  deleteMode: 'delete_when_no_subscriptions',
  enableDeleteWhileInactive: false,
  maxInactiveDuration: { value: 5, unit: 'h' }
}

type InputWithUpdateConfirmationProps = {
  onChange: PoliciesInputProps['onChange'];
  value: PoliciesInputProps['value'];
}
const InputWithUpdateConfirmation: React.FC<InputWithUpdateConfirmationProps> = (props) => {
  const [value, setValue] = useState(props.value);

  useEffect(() => {
    setValue(() => props.value);
  }, [props.value]);

  const handleUpdate = () => props.onChange(value);

  return (
    <div
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          handleUpdate();
        }
      }}
    >
      <PoliciesInput
        value={value}
        onChange={(v) => setValue(() => v)}
      />
      {JSON.stringify(props.value) !== JSON.stringify(value) && (
        <UpdateConfirmation
          onUpdate={handleUpdate}
          onReset={() => setValue(props.value)}
        />
      )}
    </div>
  )
}

type PoliciesInputProps = {
  value: Policies;
  onChange: (retention: Policies) => void;
}
const PoliciesInput: React.FC<PoliciesInputProps> = (props) => {
  const [policies, setPolicies] = useState<Policies>(props.value);

  useEffect(() => {
    setPolicies(() => props.value);
  }, [props.value]);

  useEffect(() => {
    props.onChange(policies);
  }, [policies]);

  return (
    <div>
      <div className={sf.FormItem}>
        <SelectInput<'enabled' | 'disabled'>
          list={[{ value: 'disabled', title: 'Disabled' }, { value: 'enabled', title: 'Enabled' }]}
          onChange={(v) => setPolicies(v === 'disabled' ? 'disabled' : defaultPolicies)}
          value={policies === 'disabled' ? 'disabled' : 'enabled'}
        />
      </div>
      {policies !== 'disabled' && (
        <div>
          <strong className={sf.FormLabel}>Delete mode</strong>
          <div className={sf.FormItem}>
            <SelectInput<DeleteMode>
              list={[{ value: 'delete_when_no_subscriptions', title: 'Delete when no subscriptions' }, { value: 'delete_when_subscriptions_caught_up', title: 'Delete when subscriptions caught up' }]}
              onChange={(v) => setPolicies({ ...policies, deleteMode: v })}
              value={policies.deleteMode}
            />
          </div>
          <strong className={sf.FormLabel}>Enable delete while inactive</strong>
          <div className={sf.FormItem}>
            <SelectInput<EnableWhileDeleteInactive>
              list={[{ value: true, title: 'Enabled' }, { value: false, title: 'Disabled' }]}
              onChange={(v) => setPolicies({ ...policies, enableDeleteWhileInactive: v })}
              value={policies.enableDeleteWhileInactive}
            />
          </div>
          <strong className={sf.FormLabel}>Max inactive duration</strong>
          <div className={sf.FormItem}>
            <DurationInput
              value={policies.maxInactiveDuration}
              onChange={(v) => {
                setPolicies({ ...policies, maxInactiveDuration: v });
              }}
            />
          </div>
        </div>
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

  const onUpdateError = (err: string) => notifyError(`Can't update inactive topic policies. ${err}`);
  const swrKey = ['pulsar', 'tenants', props.tenant, 'namespaces', props.namespace, 'policies', policyId];

  const { data: policies, error: retentionError } = useSWR(
    swrKey,
    async () => await adminClient.namespaces.getInactiveTopicPolicies(props.tenant, props.namespace)
  );

  if (retentionError) {
    notifyError(`Unable to get inactive topic policies. ${retentionError}`);
  }

  return (
    <InputWithUpdateConfirmation
      value={policies === undefined ? 'disabled' : {
        deleteMode: policies.inactiveTopicDeleteMode === undefined ? defaultPolicies.deleteMode : policies.inactiveTopicDeleteMode,
        enableDeleteWhileInactive: policies.deleteWhileInactive === undefined ? defaultPolicies.enableDeleteWhileInactive : policies.deleteWhileInactive,
        maxInactiveDuration: policies.maxInactiveDurationSeconds === undefined ? defaultPolicies.maxInactiveDuration : secondsToDuration(policies.maxInactiveDurationSeconds)
      }}
      onChange={async (v) => {
        if (v === 'disabled') {
          await adminClient.namespaces.removeInactiveTopicPolicies(props.tenant, props.namespace);
        } else {
          await adminClient.namespaces.setInactiveTopicPolicies(props.tenant, props.namespace, {
            deleteWhileInactive: v.enableDeleteWhileInactive,
            inactiveTopicDeleteMode: v.deleteMode,
            maxInactiveDurationSeconds: durationToSeconds(v.maxInactiveDuration)
          }).catch(onUpdateError);
        }

        await mutate(swrKey);
      }}
    />
  );
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policyId,
  title: 'Inactive topic policies',
  description: <span>Set the inactive topic policies on a namespace.</span>,
  input: <FieldInput {...props} />
});

export default field;
