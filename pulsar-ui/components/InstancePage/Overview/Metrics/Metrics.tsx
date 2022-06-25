import React from 'react';
import s from './Metrics.module.css'
import sts from '../../../ui/SimpleTable/SimpleTable.module.css';
import useSWR from 'swr';
import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarCustomApiClient from '../../../app/contexts/PulsarCustomApiClient/PulsarCustomApiClient';
import { swrKeys } from '../../../swrKeys';
import { TenantMetrics } from 'tealtools-pulsar-ui-api/metrics/types';
import * as I18n from '../../../app/contexts/I18n/I18n';

const Metrics: React.FC = () => {
  const customApiClient = PulsarCustomApiClient.useContext().client;
  const { notifyError } = Notifications.useContext();
  const i18n = I18n.useContext();

  const { data: allTenantsMetrics, error: allTenantsMetricsError } = useSWR(
    swrKeys.pulsar.customApi.metrics.allTenants._(),
    async () => await customApiClient.getAllTenantsMetrics(),
  );

  if (allTenantsMetricsError) {
    notifyError(`Unable to get all tenants metrics. ${allTenantsMetricsError}`);
  }

  return (
    <div className={s.Metrics}>
      <div className={s.Title}>Metrics</div>
      <table className={sts.Table}>
        <tr className={sts.Row}>
          <td className={sts.Cell}><strong>Msg. rate in</strong></td>
          <td className={sts.Cell}>{i18n.formatRate(sum(allTenantsMetrics || {}, 'msgRateIn'))}</td>
        </tr>
        <tr className={sts.Row}>
          <td className={sts.Cell}><strong>Msg. rate out</strong></td>
          <td className={sts.Cell}>{i18n.formatRate(sum(allTenantsMetrics || {}, 'msgRateOut'))}</td>
        </tr>
        <tr className={sts.Row}>
          <td className={sts.Cell}><strong>Msg. throughput in</strong></td>
          <td className={sts.Cell}>{i18n.formatRate(sum(allTenantsMetrics || {}, 'msgThroughputIn'))}</td>
        </tr>
        <tr className={sts.Row}>
          <td className={sts.Cell}><strong>Msg. throughput out</strong></td>
          <td className={sts.Cell}>{i18n.formatRate(sum(allTenantsMetrics || {}, 'msgThroughputOut'))}</td>
        </tr>
        <tr className={sts.Row}>
          <td className={sts.Cell}><strong>Msg. in</strong></td>
          <td className={sts.Cell}>{i18n.formatCount(sum(allTenantsMetrics || {}, 'msgInCount'))}</td>
        </tr>
        <tr className={sts.Row}>
          <td className={sts.Cell}><strong>Msg. out</strong></td>
          <td className={sts.Cell}>{i18n.formatCount(sum(allTenantsMetrics || {}, 'msgOutCount'))}</td>
        </tr>
        <tr className={sts.Row}>
          <td className={sts.Cell}><strong>Avg msg. size</strong></td>
          <td className={sts.Cell}>{i18n.formatBytes(Object.keys(allTenantsMetrics || {}).length > 0 ? sum(allTenantsMetrics || {}, 'averageMsgSize') / Object.keys(allTenantsMetrics || {}).length : 0)}</td>
        </tr>
        <tr className={sts.Row}>
          <td className={sts.Cell}><strong>Bytes in</strong></td>
          <td className={sts.Cell}>{i18n.formatBytes(sum(allTenantsMetrics || {}, 'bytesInCount'))}</td>
        </tr>
        <tr className={sts.Row}>
          <td className={sts.Cell}><strong>Bytes out</strong></td>
          <td className={sts.Cell}>{i18n.formatBytes(sum(allTenantsMetrics || {}, 'bytesOutCount'))}</td>
        </tr>
        <tr className={sts.Row}>
          <td className={sts.Cell}><strong>Producers</strong></td>
          <td className={sts.Cell}>{i18n.formatCount(sum(allTenantsMetrics || {}, 'producerCount'))}</td>
        </tr>
        <tr className={sts.Row}>
          <td className={sts.Cell}><strong>Pending entries</strong></td>
          <td className={sts.Cell}>{i18n.formatCount(sum(allTenantsMetrics || {}, 'pendingAddEntriesCount'))}</td>
        </tr>
        <tr className={sts.Row}>
          <td className={sts.Cell}><strong>Backlog size</strong></td>
          <td className={sts.Cell}>{i18n.formatCount(sum(allTenantsMetrics || {}, 'pendingAddEntriesCount'))}</td>
        </tr>
        <tr className={sts.Row}>
          <td className={sts.Cell}><strong>Storage size</strong></td>
          <td className={sts.Cell}>{i18n.formatBytes(sum(allTenantsMetrics || {}, 'storageSize'))}</td>
        </tr>
      </table>
    </div>
  );
}

export default Metrics;
function sum(metrics: Record<string, TenantMetrics>, key: keyof TenantMetrics): number {
  return Object.values(metrics).reduce((acc, cur) => acc + (cur[key] || 0), 0);
}

