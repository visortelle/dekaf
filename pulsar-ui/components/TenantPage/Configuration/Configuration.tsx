import React from 'react';
import s from './Configuration.module.css'
import useSWR, { useSWRConfig } from 'swr';
import { ConfigurationField, ListValue } from '../../ConfigurationTable/values';
import ConfigurationTable from '../../ConfigurationTable/ConfigurationTable';
import * as Notifications from '../../contexts/Notifications';
import * as PulsarAdminClient from '../../contexts/PulsarAdminClient';
import * as Either from 'fp-ts/lib/Either';
import StringEditor from '../../ConfigurationTable/String/StringEditor/StringEditor';
import SelectInput from '../../ConfigurationTable/SelectInput/SelectInput';

export type ConfigurationProps = {
  tenant: string
};

type AdminRolesValue = ListValue<string>;
type AllowedClustersValue = ListValue<string>;

const Configuration: React.FC<ConfigurationProps> = (props) => {
  const adminClient = PulsarAdminClient.useContext().client;
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig()

  const onTenantUpdateError = (err: string) => notifyError(`Can't update tenant configuration: ${err}`);

  const { data: clusters, error: clustersError } = useSWR(
    ['pulsar', 'clusters'],
    async () => await adminClient.clusters.getClusters()
  );

  if (clustersError) {
    notifyError(`Unable to get clusters list: ${clustersError}`)
  }

  const { data: configuration, error: configurationError } = useSWR(
    ['pulsar', 'tenants', props.tenant, 'configuration'],
    async () => await adminClient.tenants.getTenantAdmin(props.tenant) as unknown as { adminRoles: string[], allowedClusters: string[] }
  );

  if (configurationError) {
    notifyError(`Unable to get tenant admin roles: ${configurationError}`)
  }

  const adminRoles: AdminRolesValue = {
    type: 'list',
    value: configuration?.adminRoles || [],
    getId: (v) => v,
    renderItem: (v) => <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</span>,
    editor: {
      render: (v, onChange) => <StringEditor value={v} onChange={onChange} placeholder="Type role" />,
      initialValue: '',
    },
    onRemove: (id) => {
      if (!configuration) {
        return
      }

      (async () => {
        await adminClient.tenants.updateTenant(props.tenant, { ...configuration, adminRoles: configuration.adminRoles.filter(r => r !== id) }).catch(onTenantUpdateError);
        await mutate(['pulsar', 'tenants', props.tenant, 'configuration']);
      })()
    },
    onAdd: (v) => {
      (async () => {
        if (!configuration) {
          return
        }

        await mutate(['pulsar', 'tenants', props.tenant, 'configuration']);
        await adminClient.tenants.updateTenant(props.tenant, { ...configuration, adminRoles: [...configuration.adminRoles, v] }).catch(onTenantUpdateError);
        await mutate(['pulsar', 'tenants', props.tenant, 'configuration']);
      })()
    },
    isValid: (v) => v.length > 0 ? Either.right(undefined) : Either.left(new Error('Admin roles cannot be empty')),
  };

  const allowedClusters: AllowedClustersValue = {
    type: 'list',
    value: configuration?.allowedClusters || [],
    getId: (v) => v,
    renderItem: (v) => <div>{v}</div>,
    editor: {
      render: (v, onChange) => (
        <SelectInput
          list={(clusters || []).filter(c => !allowedClusters.value.some(ac => ac === c)).map(c => ({ id: c, title: c }))}
          value={v}
          prependWithEmptyItem={true}
          onChange={onChange}
          placeholder="Select cluster"
        />),
      initialValue: '',
    },
    onRemove: configuration?.allowedClusters.length === 1 ? undefined : (id) => {
      if (!configuration) {
        return
      }

      (async () => {
        await adminClient.tenants.updateTenant(props.tenant, { ...configuration, allowedClusters: configuration.allowedClusters.filter(r => r !== id) }).catch(onTenantUpdateError);
        await mutate(['pulsar', 'tenants', props.tenant, 'configuration']);
      })()
    },
    onAdd: (v) => {
      (async () => {
        if (!configuration) {
          return
        }

        await mutate(['pulsar', 'tenants', props.tenant, 'configuration']);
        await adminClient.tenants.updateTenant(props.tenant, { ...configuration, allowedClusters: [...configuration.allowedClusters, v] }).catch(onTenantUpdateError);
        await mutate(['pulsar', 'tenants', props.tenant, 'configuration']);
      })()
    },
    isValid: (v) => v.length > 0 ? Either.right(undefined) : Either.left(new Error('Allowed clusters cannot be empty')),
  };

  const adminRolesField: ConfigurationField<AdminRolesValue> = {
    id: "adminRoles",
    title: "Admin roles",
    description: "List of authenticated roles allowed to manage this tenant.",
    value: { ...adminRoles, value: adminRoles.value.sort((a, b) => a.localeCompare(b, 'en', { ignorePunctuation: true })) },
  }

  const allowedClustersField: ConfigurationField<AllowedClustersValue> = {
    id: "allowedClusters",
    title: "Allowed clusters",
    description: "List of clusters that this tenant is restricted on.",
    value: allowedClusters,
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
