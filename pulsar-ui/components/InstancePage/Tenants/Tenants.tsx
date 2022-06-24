import React from 'react';
import s from './Tenants.module.css'
import * as PulsarAdminClient from '../../app/contexts/PulsarAdminClient';
import * as PulsarCustomApiClient from '../../app/contexts/PulsarCustomApiClient/PulsarCustomApiClient';
import * as Notifications from '../../app/contexts/Notifications';
import useSWR from 'swr';
import { swrKeys } from '../../swrKeys';
import { TableVirtuoso } from 'react-virtuoso';
import { TenantMetrics } from 'tealtools-pulsar-ui-api/metrics/types';

export type TenantsProps = {};

const Tenants: React.FC<TenantsProps> = (props) => {
  const adminClient = PulsarAdminClient.useContext().client;
  const customApiClient = PulsarCustomApiClient.useContext().client;
  const { notifyError } = Notifications.useContext();

  const { data: tenants, error: tenantsError } = useSWR(
    swrKeys.pulsar.tenants._(),
    async () => await adminClient.tenants.getTenants()
  );
  if (tenantsError) {
    notifyError(`Unable to get tenants list. ${tenantsError}`);
  }

  const { data: allTenantsMetrics, error: allTenantsMetricsError } = useSWR(
    ['abc'],
    async () => await customApiClient.getAllTenantsMetrics(),
    {refreshInterval: 10 * 1000}
  );
  if (allTenantsMetricsError) {
    notifyError(`Unable to get metrics. ${allTenantsMetricsError}`);
  }

  return (
    <div className={s.Tenants}>
      <TableVirtuoso
        data={tenants?.sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))}
        overscan={{ main: window.innerHeight / 2, reverse: window.innerHeight / 2 }}
        itemContent={(_, tenant) => {

        const tenantMetrics = (allTenantsMetrics || {})[tenant];
        return <Tenant tenant={tenant} metrics={tenantMetrics}/>
      }}
        useWindowScroll={true}
        totalCount={tenants?.length}
      />
    </div>
  );
}

type TenantProps = {
  tenant: string;
  metrics: TenantMetrics
}
const Tenant: React.FC<TenantProps> = (props) => {
  return (
    <>
      <td>{props.tenant}</td>
      <td>{withDefault(props.metrics?.averageMsgSize, '')}</td>
      <td>{withDefault(props.metrics?.bytesInCount, '')}</td>
      <td>{withDefault(props.metrics?.msgInCount, '')}</td>
    </>
  );
}

export default Tenants;

function withDefault(value: any, defaultValue: any) {
  return value === undefined ? defaultValue : value;
}
