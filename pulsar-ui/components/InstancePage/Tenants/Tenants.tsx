import React from 'react';
import s from './Tenants.module.css'
import * as PulsarAdminClient from '../../app/contexts/PulsarAdminClient';
import * as PulsarBrokerStatsClient from '../../app/contexts/PulsarBrokerStatsClient/PulsarBrokerStatsClient';
import * as Notifications from '../../app/contexts/Notifications';
import useSWR from 'swr';
import { swrKeys } from '../../swrKeys';
import { TableVirtuoso } from 'react-virtuoso';
import { MetricsMap, Metric } from '../../../pages/api/broker-stats/metrics';

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
    async () => await brokerStatsClient.getMetrics({ type: 'all-tenants' }) as unknown as Record<string, TenantMetricSchema>,
  );
  if (metricsError) {
    notifyError(`Unable to get metrics. ${metricsError}`);
  }

  return (
    <div className={s.Tenants}>
      <TableVirtuoso
        data={tenants?.sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))}
        overscan={{ main: window.innerHeight / 2, reverse: window.innerHeight / 2 }}
        itemContent={(_, tenant) => {

        const tenantMetrics = (metrics || {})[tenant];
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
  metrics: TenantMetricSchema | undefined
}
const Tenant: React.FC<TenantProps> = (props) => {
  return (
    <>
      <td>{props.tenant}</td>
      <td>{withDefault(props.metrics?.brk_ml_AddEntryWithReplicasBytesRate, '')}</td>
      <td>{withDefault(props.metrics?.brk_ml_ReadEntriesRate, '')}</td>
      <td>{withDefault(props.metrics?.brk_ml_AddEntryBytesRate, '')}</td>
      <td>{withDefault(props.metrics?.brk_ml_AddEntryBytesRate, '')}</td>
    </>
  );
}

export default Tenants;

function withDefault(value: any, defaultValue: any) {
  return value === undefined ? defaultValue : value;
}

type TenantMetrics = {
  inRateBytes: number | undefined,
  outRateBytes: number | undefined,
  inThroughputBytes: number | undefined,
  outThroughputBytes: number | undefined,
  storageSizeBytes: number | undefined,
  messagesInBacklog: number | undefined,
}

type TenantMetricSchema = {
  "brk_ml_AddEntryBytesRate": number | undefined,
  "brk_ml_AddEntryErrors": number | undefined,
  "brk_ml_AddEntryLatencyBuckets_0.0_0.5": number | undefined,
  "brk_ml_AddEntryLatencyBuckets_0.5_1.0": number | undefined,
  "brk_ml_AddEntryLatencyBuckets_1.0_5.0": number | undefined,
  "brk_ml_AddEntryLatencyBuckets_10.0_20.0": number | undefined,
  "brk_ml_AddEntryLatencyBuckets_100.0_200.0": number | undefined,
  "brk_ml_AddEntryLatencyBuckets_20.0_50.0": number | undefined,
  "brk_ml_AddEntryLatencyBuckets_200.0_1000.0": number | undefined,
  "brk_ml_AddEntryLatencyBuckets_5.0_10.0": number | undefined,
  "brk_ml_AddEntryLatencyBuckets_50.0_100.0": number | undefined,
  "brk_ml_AddEntryLatencyBuckets_OVERFLOW": number | undefined,
  "brk_ml_AddEntryMessagesRate": number | undefined,
  "brk_ml_AddEntrySucceed": number | undefined,
  "brk_ml_AddEntryWithReplicasBytesRate": number | undefined,
  "brk_ml_EntrySizeBuckets_0.0_128.0": number | undefined,
  "brk_ml_EntrySizeBuckets_1024.0_2048.0": number | undefined,
  "brk_ml_EntrySizeBuckets_102400.0_1048576.0": number | undefined,
  "brk_ml_EntrySizeBuckets_128.0_512.0": number | undefined,
  "brk_ml_EntrySizeBuckets_16384.0_102400.0": number | undefined,
  "brk_ml_EntrySizeBuckets_2048.0_4096.0": number | undefined,
  "brk_ml_EntrySizeBuckets_4096.0_16384.0": number | undefined,
  "brk_ml_EntrySizeBuckets_512.0_1024.0": number | undefined,
  "brk_ml_EntrySizeBuckets_OVERFLOW": number | undefined,
  "brk_ml_LedgerAddEntryLatencyBuckets_0.0_0.5": number | undefined,
  "brk_ml_LedgerAddEntryLatencyBuckets_0.5_1.0": number | undefined,
  "brk_ml_LedgerAddEntryLatencyBuckets_1.0_5.0": number | undefined,
  "brk_ml_LedgerAddEntryLatencyBuckets_10.0_20.0": number | undefined,
  "brk_ml_LedgerAddEntryLatencyBuckets_100.0_200.0": number | undefined,
  "brk_ml_LedgerAddEntryLatencyBuckets_20.0_50.0": number | undefined,
  "brk_ml_LedgerAddEntryLatencyBuckets_200.0_1000.0": number | undefined,
  "brk_ml_LedgerAddEntryLatencyBuckets_5.0_10.0": number | undefined,
  "brk_ml_LedgerAddEntryLatencyBuckets_50.0_100.0": number | undefined,
  "brk_ml_LedgerAddEntryLatencyBuckets_OVERFLOW": number | undefined,
  "brk_ml_LedgerSwitchLatencyBuckets_0.0_0.5": number | undefined,
  "brk_ml_LedgerSwitchLatencyBuckets_0.5_1.0": number | undefined,
  "brk_ml_LedgerSwitchLatencyBuckets_1.0_5.0": number | undefined,
  "brk_ml_LedgerSwitchLatencyBuckets_10.0_20.0": number | undefined,
  "brk_ml_LedgerSwitchLatencyBuckets_100.0_200.0": number | undefined,
  "brk_ml_LedgerSwitchLatencyBuckets_20.0_50.0": number | undefined,
  "brk_ml_LedgerSwitchLatencyBuckets_200.0_1000.0": number | undefined,
  "brk_ml_LedgerSwitchLatencyBuckets_5.0_10.0": number | undefined,
  "brk_ml_LedgerSwitchLatencyBuckets_50.0_100.0": number | undefined,
  "brk_ml_LedgerSwitchLatencyBuckets_OVERFLOW": number | undefined,
  "brk_ml_MarkDeleteRate": number | undefined,
  "brk_ml_NumberOfMessagesInBacklog": number | undefined,
  "brk_ml_ReadEntriesBytesRate": number | undefined,
  "brk_ml_ReadEntriesErrors": number | undefined,
  "brk_ml_ReadEntriesRate": number | undefined,
  "brk_ml_ReadEntriesSucceeded": number | undefined,
  "brk_ml_StoredMessagesSize": number | undefined
}

// const getTenantMetrics(metrics: TenantMetricSchema): TenantMetrics {
//   return {

//   }
// }
