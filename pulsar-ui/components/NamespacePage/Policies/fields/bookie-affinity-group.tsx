import * as Notifications from '../../../contexts/Notifications';
import * as PulsarAdminClient from '../../../contexts/PulsarAdminClient';
import useSWR, { useSWRConfig } from "swr";
import { ConfigurationField } from "../../../ConfigurationTable/ConfigurationTable";
import Input from '../../../ConfigurationTable/Input/Input';
import ListInput from '../../../ConfigurationTable/ListInput/ListInput';
import * as Either from 'fp-ts/Either';
import sf from '../../../ConfigurationTable/form.module.css';
import { swrKeys } from '../../../swrKeys';

const policy = 'bookieAffinityGroup';

export type FieldInputProps = {
  tenant: string;
  namespace: string;
}

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const adminClient = PulsarAdminClient.useContext().client;
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig()

  const onUpdateError = (err: string) => notifyError(`Can't update bookie affinity group. ${err}`);
  const swrKey = swrKeys.pulsar.tenants.tenant.namespaces.namespace.policies.policy({ tenant: props.tenant, namespace: props.namespace, policy });

  const { data: bookieAffinityGroupData, error: bookieAffinityGroupError } = useSWR(
    swrKey,
    async () => await adminClient.namespaces.getBookieAffinityGroup(props.tenant, props.namespace)
  );

  if (bookieAffinityGroupError) {
    notifyError(`Unable to get bookie affinity group. ${bookieAffinityGroupError}`);
  }

  const primaryGroups = bookieAffinityGroupData?.bookkeeperAffinityGroupPrimary?.split(',') || [];
  const secondaryGroups = bookieAffinityGroupData?.bookkeeperAffinityGroupSecondary?.split(',') || [];

  return (
    <div>
      <div className={sf.FormItem}>
        <strong className={sf.FormLabel}>Primary groups</strong>
        <ListInput<string>
          value={primaryGroups}
          getId={(v) => v}
          renderItem={(v) => <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</span>}
          editor={{
            render: (v, onChange) => <Input value={v} onChange={onChange} placeholder="Enter group name" />,
            initialValue: '',
          }}
          onRemove={async (roleId) => {
            const bookkeeperAffinityGroupPrimary = primaryGroups.filter(r => r !== roleId).join(',') || undefined;
            await adminClient.namespaces.setBookieAffinityGroup(
              props.tenant,
              props.namespace,
              {
                bookkeeperAffinityGroupPrimary,
                bookkeeperAffinityGroupSecondary: bookieAffinityGroupData?.bookkeeperAffinityGroupSecondary
              }).catch(onUpdateError);
            await mutate(swrKey);
          }}
          onAdd={async (v) => {
            const bookkeeperAffinityGroupPrimary = Array.from(new Set([...primaryGroups, v])).join(','); // XXX - Array.from(new Set) is a workaround for missing validation for unique groups at the Pulsar REST API side.
            await adminClient.namespaces.setBookieAffinityGroup(
              props.tenant,
              props.namespace,
              {
                bookkeeperAffinityGroupPrimary,
                bookkeeperAffinityGroupSecondary: bookieAffinityGroupData?.bookkeeperAffinityGroupSecondary
              }).catch(onUpdateError);
            await mutate(swrKey);
          }}
          isValid={(v) => v.length > 0 ? Either.right(undefined) : Either.left(new Error('Group name is required'))}
        />
      </div>

      <div className={sf.FormItem}>
        <strong className={sf.FormLabel}>Secondary groups</strong>
        <ListInput<string>
          value={secondaryGroups}
          getId={(v) => v}
          renderItem={(v) => <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</span>}
          editor={{
            render: (v, onChange) => <Input value={v} onChange={onChange} placeholder="Enter group name" />,
            initialValue: '',
          }}
          onRemove={async (roleId) => {
            const bookkeeperAffinityGroupSecondary = secondaryGroups.filter(r => r !== roleId).join(',') || undefined;
            await adminClient.namespaces.setBookieAffinityGroup(
              props.tenant,
              props.namespace,
              {
                bookkeeperAffinityGroupPrimary: bookieAffinityGroupData?.bookkeeperAffinityGroupPrimary,
                bookkeeperAffinityGroupSecondary
              }).catch(onUpdateError);

            await mutate(swrKey);
          }}
          onAdd={async (v) => {
            const bookkeeperAffinityGroupSecondary = Array.from(new Set([...secondaryGroups, v])).join(','); // XXX - Array.from(new Set) is a workaround for missing validation for unique groups at the Pulsar REST API side.
            await adminClient.namespaces.setBookieAffinityGroup(
              props.tenant,
              props.namespace,
              {
                bookkeeperAffinityGroupPrimary: bookieAffinityGroupData?.bookkeeperAffinityGroupPrimary,
                bookkeeperAffinityGroupSecondary
              }).catch(onUpdateError);

            await mutate(swrKey);
          }}
          isValid={(v) => v.length > 0 ? Either.right(undefined) : Either.left(new Error('Group name is required'))}
        />
      </div>
    </div>
  )
}

const field = (props: FieldInputProps): ConfigurationField => ({
  id: policy,
  title: 'Bookie affinity group',
  description: <span>Bookie affinity group name for a namespace.</span>,
  input: <FieldInput {...props} />
});

export default field;
