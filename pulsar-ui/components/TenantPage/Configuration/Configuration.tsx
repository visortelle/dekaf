import React, { useEffect } from 'react';
import s from './Configuration.module.css'
import useSWR, { useSWRConfig } from 'swr';
import { ConfigurationField, ListValue, OneOfValue } from '../../ConfigurationTable/values';
import ConfigurationTable from '../../ConfigurationTable/ConfigurationTable';
import * as Notifications from '../../contexts/Notifications';
import * as PulsarAdminClient from '../../contexts/PulsarAdminClient';

export type ConfigurationProps = {
  tenant: string
};

type AdminRolesValue = ListValue<string>;
type ClustersValue = OneOfValue;

const Configuration: React.FC<ConfigurationProps> = (props) => {
  const adminClient = PulsarAdminClient.useContext().client;
  const { notifyError } = Notifications.useContext();
  const { mutate } = useSWRConfig()

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
    render: (v) => <div>{v}</div>,
    onRemove: (id) => {
      if (!configuration) {
        return
      }

      (async () => {
        await adminClient.tenants.updateTenant(props.tenant, { ...configuration, adminRoles: configuration.adminRoles.filter(r => r !== id) });
        await mutate(['pulsar', 'tenants', props.tenant, 'configuration']);
      })()
    },
    onCreate: (v) => {
      (async () => {
        if (!configuration) {
          return
        }

        await mutate(['pulsar', 'tenants', props.tenant, 'configuration']);
        await adminClient.tenants.updateTenant(props.tenant, { ...configuration, adminRoles: [...configuration.adminRoles, v] });
        await mutate(['pulsar', 'tenants', props.tenant, 'configuration']);
      })()
    }
  };

  const clusters: ClustersValue = {
    type: 'oneOf',
    value: {
      type: 'list',
      value: [],
      getId: (v) => v,
      render: (v) => <div>{v}</div>,
    },
    options: []
  };

  const adminRolesField: ConfigurationField<AdminRolesValue> = {
    id: "adminRoles",
    title: "Admin roles",
    description: "Roles that can manage the tenant.",
    value: adminRoles,
  }

  const allowedClustersField: ConfigurationField<ClustersValue> = {
    id: "allowedClusters",
    title: "Allowed clusters",
    description: "Roles that can manage the tenant",
    value: clusters,
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
