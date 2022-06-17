import React from 'react';
import s from './Metrics.module.css'
import * as PulsarAdminClient from '../../../app/contexts/PulsarAdminClient';
import * as Notifications from '../../../app/contexts/Notifications';
import useSWR from 'swr';
import stringify from 'safe-stable-stringify';
import _ from 'lodash';
import { swrKeys } from '../../../swrKeys';

export type InternalConfigProps = {};

const InternalConfig: React.FC<InternalConfigProps> = (props) => {
  const adminClient = PulsarAdminClient.useContext().client;
  const { notifyError } = Notifications.useContext();

  const { data: metrics, error: metricsError } = useSWR(
    swrKeys.pulsar.brokerStats.metrics,
    async () => await adminClient.brokerStats.getMetrics(),
    { refreshInterval: 1000 }
  );

  if (metricsError) {
    notifyError(`Unable to fetch metrics: ${metricsError}`);
  }

  const ms = _(metrics).groupBy('dimensions.metric').toPairs().sortBy(0).value();

  return (
    <div className={s.Metrics}>
      {ms.map(([key, value]) => {
        return <MetricsTable key={stringify(key)} title={key} metrics={value} />
      })}
    </div>
  );
}

type Metric = {
  metrics?: Record<string, string>,
  dimensions?: Record<string, string>,
}
type MetricsTableProps = {
  title: string,
  metrics?: Metric[]
}
const MetricsTable: React.FC<MetricsTableProps> = (props) => {
  if (props.metrics === undefined) {
    return <></>
  }

  return (
    <div className={s.Section}>
      <div className={s.Title}>{props.title}</div>
      {props.metrics.map(m => (
        <div key={stringify(m.dimensions)} className={s.Dimension}>
          <div className={s.Dimensions}>{stringify(m.dimensions)}</div>
          <table className={s.Table}>
            <tbody>
              {Object.entries(m?.metrics || {}).map(([key, value]) => (
                <tr className={s.Row} key={key}>
                  <td className={s.Cell}>{key}</td>
                  <td className={s.Cell}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

export default InternalConfig;
