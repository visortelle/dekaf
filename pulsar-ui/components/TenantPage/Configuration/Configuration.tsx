import React from 'react';
import s from './Configuration.module.css'
import useSWR, { useSWRConfig } from 'swr';
import ConfigurationTable, { ConfigurationField } from '../../ConfigurationTable/ConfigurationTable';
import * as Notifications from '../../contexts/Notifications';
import * as PulsarAdminClient from '../../contexts/PulsarAdminClient';
import * as Either from 'fp-ts/lib/Either';
import Input from '../../ConfigurationTable/Input/Input';
import SelectInput from '../../ConfigurationTable/SelectInput/SelectInput';
import ListInput from '../../ConfigurationTable/ListInput/ListInput';

export type ConfigurationProps = {
  tenant: string
};

const Configuration: React.FC<ConfigurationProps> = (props) => {
  const adminClient = PulsarAdminClient.useContext().client;
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig()

  const onUpdateError = (err: string) => notifyError(`Can't update tenant configuration. ${err}`);
  const swrKey = ['pulsar', 'tenants', props.tenant, 'configuration'];

  const { data: clusters, error: clustersError } = useSWR(
    ['pulsar', 'clusters'],
    async () => await adminClient.clusters.getClusters()
  );

  if (clustersError) {
    notifyError(`Unable to get clusters list. ${clustersError}`)
  }

  const { data: configuration, error: configurationError } = useSWR(
    swrKey,
    async () => await adminClient.tenants.getTenantAdmin(props.tenant) as unknown as { adminRoles: string[], allowedClusters: string[] }
  );

  if (configurationError) {
    notifyError(`Unable to get tenant admin roles. ${configurationError}`)
  }

  const adminRolesInput = <ListInput<string>
    value={configuration?.adminRoles || []}
    getId={(v) => v}
    renderItem={(v) => <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</span>}
    editor={{
      render: (v, onChange) => <Input value={v} onChange={onChange} placeholder="Type role" />,
      initialValue: '',
    }}
    onRemove={(roleId) => {
      if (!configuration) {
        return
      }

      (async () => {
        await adminClient.tenants.updateTenant(props.tenant, { ...configuration, adminRoles: configuration.adminRoles.filter(r => r !== roleId) }).catch(onUpdateError);
        await mutate(swrKey);
      })()
    }}
    onAdd={(v) => {
      (async () => {
        if (!configuration) {
          return
        }

        await adminClient.tenants.updateTenant(props.tenant, { ...configuration, adminRoles: [...configuration.adminRoles, v] }).catch(onUpdateError);
        await mutate(swrKey);
      })()
    }}
    isValid={(v) => v.length > 0 ? Either.right(undefined) : Either.left(new Error('Admin roles cannot be empty'))}
  />

  const clustersList = (clusters || []).filter(c => !configuration?.allowedClusters?.some(ac => ac === c)).map(c => ({ id: c, title: c }));
  const hideAddButton = clustersList.length === 0;

  const allowedClustersInput = <ListInput<string>
    value={configuration?.allowedClusters || []}
    getId={(v) => v}
    renderItem={(v) => <div>{v}</div>}
    editor={hideAddButton ? undefined : {
      render: (v, onChange) => (
        <SelectInput
          list={[undefined, ...clustersList]}
          value={v}
          onChange={(v) => onChange(v as string)}
          placeholder="Select cluster"
        />),
      initialValue: '',
    }}
    onRemove={clustersList.length <= 1 ? undefined : async (id) => {
      if (!configuration) {
        return
      }

      await adminClient.tenants.updateTenant(props.tenant, { ...configuration, allowedClusters: configuration.allowedClusters.filter(r => r !== id) }).catch(onUpdateError);
      await mutate(swrKey);
    }}
    onAdd={hideAddButton ? undefined : async (v) => {
      if (!configuration) {
        return
      }

      await adminClient.tenants.updateTenant(props.tenant, { ...configuration, allowedClusters: [...configuration.allowedClusters, v] }).catch(onUpdateError);
      await mutate(swrKey);
    }}
    isValid={(v) => v.length > 0 ? Either.right(undefined) : Either.left(new Error('Allowed clusters cannot be empty'))}
  />

  const adminRolesField: ConfigurationField = {
    id: "adminRoles",
    title: "Admin roles",
    description: "List of authenticated roles allowed to manage this tenant.",
    input: adminRolesInput,
  }

  const allowedClustersField: ConfigurationField = {
    id: "allowedClusters",
    title: "Allowed clusters",
    description: "List of clusters that this tenant is restricted on.",
    input: allowedClustersInput,
  }

  return (
    <div className={s.Configuration} >
      <ConfigurationTable
        fields={[
          adminRolesField,
          allowedClustersField
        ]}
      />
    </div >
  );
}

export default Configuration;
