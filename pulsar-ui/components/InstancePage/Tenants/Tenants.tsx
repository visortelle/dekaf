import React from 'react';
import s from './Tenants.module.css'
import * as PulsarAdminClient from '../../app/contexts/PulsarAdminClient';
import * as PulsarBrokerStatsClient from '../../app/contexts/PulsarBrokerStatsClient/PulsarBrokerStatsClient';
import * as Notifications from '../../app/contexts/Notifications';
import useSWR from 'swr';
import { swrKeys } from '../../swrKeys';
import { TableVirtuoso } from 'react-virtuoso';

export type TenantsProps = {};

const Tenants: React.FC<TenantsProps> = (props) => {
  const adminClient = PulsarAdminClient.useContext().client;
  const brokerStatsClient = PulsarBrokerStatsClient.useContext().client;
  const { notifyError } = Notifications.useContext();

  const { data: tenants, error: tenantsError } = useSWR(
    swrKeys.pulsar.tenants._(),
    async () => await adminClient.tenants.getTenants()
  );
  if (tenantsError) {
    notifyError(`Unable to get tenants list. ${tenantsError}`);
  }

  const { data: metrics, error: metricsError } = useSWR(
    ['abc'],
    // async () => await brokerStatsClient.getMetrics({ type: 'by-dimensions', filter: { "tenant-1": { "namespace": "tenant-1/namespace-1" } } }),
    async () => await brokerStatsClient.getMetrics({ type: 'all-tenants' }),
  );
  if (metricsError) {
    notifyError(`Unable to get metrics. ${metricsError}`);
  }
  console.log('metrics', metrics);

  return (
    <div className={s.Tenants}>
      <TableVirtuoso
        data={tenants?.sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))}
        overscan={{ main: window.innerHeight / 2, reverse: window.innerHeight / 2 }}
        itemContent={(_, tenant) => {
          return <Tenant tenant={tenant} />
        }}
        useWindowScroll={true}
        totalCount={tenants?.length}
      />
    </div>
  );
}

type TenantProps = {
  tenant: string;
}
const Tenant: React.FC<TenantProps> = (props) => {
  return (
    <>
      <td>{props.tenant}</td>
    </>
  );
}

export default Tenants;
