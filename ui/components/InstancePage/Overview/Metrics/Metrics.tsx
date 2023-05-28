import React, { useCallback, useEffect } from 'react';
import s from './Metrics.module.css'
import * as GrpcClient from '../../../app/contexts/GrpcClient/GrpcClient';
import * as Notifications from '../../../app/contexts/Notifications';
import * as I18n from '../../../app/contexts/I18n/I18n';
import useSWR from 'swr';
import stringify from 'safe-stable-stringify';
import _ from 'lodash';
import { swrKeys } from '../../../swrKeys';
import Input from '../../../ui/Input/Input';
import Highlighter from "react-highlight-words";
import sf from '../../../ui/ConfigurationTable/form.module.css';
import { useQueryParam, withDefault, StringParam } from 'use-query-params';
import { useDebounce } from 'use-debounce'
import { TableVirtuoso } from 'react-virtuoso';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import { GetBrokerStatsJsonRequest } from '../../../../grpc-web/tools/teal/pulsar/ui/brokerstats/v1/brokerstats_pb';

const filterKvsAndOp = "&&";
const filterKvSep = "=";

type Metric = {
  metrics?: Record<string, string>,
  dimensions?: Record<string, string>,
}

const InternalConfig: React.FC = () => {
  const { brokerstatsServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const [dimensionsFilter, setDimensionsFilter] = useQueryParam('dimensionsFilter', withDefault(StringParam, ''));
  const [dimensionsFilterDebounced] = useDebounce(dimensionsFilter, 400)
  const [dimensionsFilterKvs, setDimensionsFilterKvs] = React.useState<{ key: string, value: string }[]>([]);
  const [metrics, setMetrics] = React.useState<[string, Metric[]][]>([]);

  const { data: metricsData, error: metricsError } = useSWR(
    swrKeys.pulsar.brokerStats.metrics,
    async () => {
      const req = new GetBrokerStatsJsonRequest();
      const res = await brokerstatsServiceClient.getBrokerStatsJson(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get broker stats: ${res.getStatus()?.getMessage()}`);
        return [];
      }
      return JSON.parse(res.getStatsJson()) as Metric[];
    },
  );

  if (metricsError) {
    notifyError(`Unable to fetch metrics: ${metricsError}`);
  }

  useEffect(() => {
    const kvs = dimensionsFilterDebounced
      .split(filterKvsAndOp)
      .map((d) => d.includes(filterKvSep) ? d.trim() : undefined)
      .filter(kv => kv !== undefined).map(kv => kv || '')
      .map((d) => d.split(filterKvSep))
      .map(([k, v]) => ({ key: k, value: v }));

    let filteredMetrics = dimensionsFilterDebounced.length === 0 ? metricsData : [];
    if (kvs.length === 0) {
      filteredMetrics = metricsData?.filter(m => m.dimensions?.metric !== undefined && Object.entries(m.dimensions || {}).some(([k, v]) => {
        if (k.includes(dimensionsFilterDebounced) || v.includes(dimensionsFilterDebounced)) {
          return true;
        }
      }));
    } else {
      filteredMetrics = metricsData?.filter(m => {
        return kvs.every((kv) => Object.entries(m.dimensions || {}).some(([k, v]) => {
          return k === kv.key && v.includes(kv.value);
        }));
      });
    }

    const metrics = _(filteredMetrics).groupBy('dimensions.metric').toPairs().sortBy(0).value();

    setDimensionsFilterKvs(() => kvs);
    setMetrics(() => metrics);
  }, [metricsData, dimensionsFilterDebounced]);

  const renderMetric = useCallback(([key, value]: [string, Metric[]]) => {
    return (
      <MetricsTable
        key={key}
        title={key}
        metrics={value}
        highlightDimensions={[
          dimensionsFilterDebounced,
          ...dimensionsFilterKvs.map(({ key, value }) => [`"${key}":"${value}`, `"${key}":"${value}"`]).flat(),
        ]}
      />
    );
  }, [dimensionsFilterDebounced, dimensionsFilterKvs]);

  return (
    <div className={s.Metrics}>
      <div className={s.Filters}>
        <strong className={sf.FormLabel}>
          Filter by metric dimensions
        </strong>
        <Input
          value={dimensionsFilter}
          onChange={v => setDimensionsFilter(() => v)}
          placeholder={`cluster=standalone ${filterKvsAndOp} broker=localhost`}
          focusOnMount={true}
          clearable={true}
        />
      </div>

      <TableVirtuoso
        data={metrics}
        itemContent={(_, ms) => <><td>{renderMetric(ms)}</td></>}
        useWindowScroll={true}
        overscan={{ main: window.innerHeight, reverse: window.innerHeight }}
        totalCount={metrics.length}
      />
    </div>
  );
}

type MetricsTableProps = {
  title: string,
  highlightDimensions: string[],
  metrics: Metric[],
}
const MetricsTable: React.FC<MetricsTableProps> = (props) => {
  const i18n = I18n.useContext();

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
              highlightClassName="highlight-substring"
              searchWords={props.highlightDimensions}
              autoEscape={true}
              textToHighlight={stringify(m.dimensions) || ''}
            />
          </div>
          <table className={s.Table}>
            <tbody>
              {Object.entries(m?.metrics || {}).map(([key, value]) => {
                let v = value;
                switch (key) {
                  case 'brk_default_pool_allocated': v = i18n.formatBytes(Number(value)); break;
                  case 'brk_default_pool_used': v = i18n.formatBytes(Number(value)); break;
                  case 'jvm_direct_memory_used': v = i18n.formatBytes(Number(value)); break;
                  case 'jvm_heap_used': v = i18n.formatBytes(Number(value)); break;
                  case 'jvm_max_direct_memory': v = i18n.formatBytes(Number(value)); break;
                  case 'jvm_max_memory': v = i18n.formatBytes(Number(value)); break;
                  case 'jvm_total_memory': v = i18n.formatBytes(Number(value)); break;
                }

                return (
                  <tr className={s.Row} key={key}>
                    <td className={s.Cell}>{key}</td>
                    <td className={s.Cell}>{v}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

export default InternalConfig;
