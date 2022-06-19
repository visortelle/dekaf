import React, { useEffect } from 'react';
import s from './Metrics.module.css'
import * as PulsarAdminClient from '../../../app/contexts/PulsarAdminClient';
import * as Notifications from '../../../app/contexts/Notifications';
import useSWR from 'swr';
import stringify from 'safe-stable-stringify';
import _ from 'lodash';
import { swrKeys } from '../../../swrKeys';
import Input from '../../../ui/Input/Input';
import Highlighter from "react-highlight-words";
import sf from '../../../ui/ConfigurationTable/form.module.css';
import { useQueryParam, withDefault, StringParam } from 'use-query-params';
import { TableVirtuoso } from 'react-virtuoso';

const filterKvsAndOp = "&&";
const filterKvSep = "=";

const InternalConfig: React.FC = () => {
  const adminClient = PulsarAdminClient.useContext().client;
  const { notifyError } = Notifications.useContext();
  const [dimensionsFilter, setDimensionsFilter] = useQueryParam('dimensionsFilter', withDefault(StringParam, ''));
  const [dimensionsFilterKvs, setDimensionsFilterKvs] = React.useState<{ key: string, value: string }[]>([]);

  const { data: metricsData, error: metricsError } = useSWR(
    swrKeys.pulsar.brokerStats.metrics,
    async () => await adminClient.brokerStats.getMetrics(),
    { refreshInterval: 5000 }
  );

  if (metricsError) {
    notifyError(`Unable to fetch metrics: ${metricsError}`);
  }

  useEffect(() => {
    const kvs = dimensionsFilter
      .split(filterKvsAndOp)
      .map((d) => d.includes(filterKvSep) ? d.trim() : undefined)
      .filter(kv => kv !== undefined).map(kv => kv || '')
      .map((d) => d.split(filterKvSep))
      .map(([k, v]) => ({ key: k, value: v }));

    setDimensionsFilterKvs(() => kvs);
  }, [dimensionsFilter]);

  let filteredMetrics = dimensionsFilter.length === 0 ? metricsData : [];

  if (dimensionsFilterKvs.length === 0) {
    filteredMetrics = metricsData?.filter(m => Object.entries(m.dimensions || {}).some(([k, v]) => {
      if (k.includes(dimensionsFilter) || v.includes(dimensionsFilter)) {
        return true;
      }
    }));
  } else {
    filteredMetrics = metricsData?.filter(m => {
      return dimensionsFilterKvs.every((kv) => Object.entries(m.dimensions || {}).some(([k, v]) => {
        return k === kv.key && v.includes(kv.value);
      }));
    });
  }


  const metrics = _(filteredMetrics).groupBy('dimensions.metric').toPairs().sortBy(0).value();

  return (
    <div className={s.Metrics}>
      <div className={s.Filters}>
        <strong className={sf.FormLabel}>
          Filter by metric dimensions:
        </strong>
        <Input
          value={dimensionsFilter}
          onChange={v => setDimensionsFilter(v)}
          placeholder={`cluster=standalone ${filterKvsAndOp} broker=localhost`}
          focusOnMount={true}
          clearable={true}
        />
      </div>

      {metrics.map(([key, value]) => {
        return (
          <MetricsTable
            key={stringify(key)}
            title={key}
            metrics={value}
            highlightDimensions={[
              dimensionsFilter,
              ...dimensionsFilterKvs.map(({ key, value }) => [`"${key}":"${value}`, `"${key}":"${value}"`]).flat(),
            ]}
          />
        );
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
  highlightDimensions: string[],
  metrics: Metric[],
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
          <div className={s.Dimensions}>
            <Highlighter
              highlightClassName={s.Highlight}
              searchWords={props.highlightDimensions}
              autoEscape={true}
              textToHighlight={stringify(m.dimensions)}
            />
          </div>
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
