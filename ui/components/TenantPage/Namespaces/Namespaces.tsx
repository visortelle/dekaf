import React, { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import s from './Namespaces.module.css'
import cts from "../../ui/ChildrenTable/ChildrenTable.module.css";
import arrowDownIcon from '../../ui/ChildrenTable/arrow-down.svg';
import arrowUpIcon from '../../ui/ChildrenTable/arrow-up.svg';
import SvgIcon from '../../ui/SvgIcon/SvgIcon';
import * as PulsarGrpcClient from '../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import * as Notifications from '../../app/contexts/Notifications';
import * as I18n from '../../app/contexts/I18n/I18n';
import useSWR from 'swr';
import { swrKeys } from '../../swrKeys';
import { ListItem, TableVirtuoso } from 'react-virtuoso';
import { isEqual, partition } from 'lodash';
import Highlighter from "react-highlight-words";
import Link from '../../ui/Link/Link';
import { routes } from '../../routes';
import { TopicIcon, ProducerIcon, ConsumerIcon, SubscriptionIcon } from '../../ui/Icons/Icons';
import Input from '../../ui/Input/Input';
import { useDebounce } from 'use-debounce';
import { useRef } from 'react';
import _ from 'lodash';
import { GetNamespacesMetricsRequest } from '../../../grpc-web/tools/teal/pulsar/ui/metrics/v1/metrics_pb';
import pb from '../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb';
import { Code } from '../../../grpc-web/google/rpc/code_pb';
import { metricsFromPb, NamespaceMetrics } from './converters';

type SortKey =
  'namespace' |
  'inRate' |
  'inTpRate' |
  'maxReplicationDelaySecond' |
  'msgBacklog' |
  'noOfConsumers' |
  'noOfProducers' |
  'noOrReplicators' |
  'noOfSubscriptions' |
  'outRate' |
  'outTpRate' |
  'replicationBacklog' |
  'storageSize'

type Sort = { key: SortKey, direction: 'asc' | 'desc' };

const firstColumnWidth = '15ch';

type NamespacesProps = {
  tenant: string;
}

const Namespaces: React.FC<NamespacesProps> = (props) => {
  const tableRef = useRef<HTMLDivElement>(null);
  const { namespaceServiceClient, metricsServiceClient } = PulsarGrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const [filterQuery, setFilterQuery] = useState('');
  const [filterQueryDebounced] = useDebounce(filterQuery, 400);
  const [itemsRendered, setItemsRendered] = useState<ListItem<string>[]>([]);
  const [itemsRenderedDebounced] = useDebounce(itemsRendered, 400);
  const [namespaceTopicsCountCache, setNamespaceTopicsCountCache] = useState<Record<string, { persistent: number, nonPersistent: number }>>({});
  const [sort, setSort] = useState<Sort>({ key: 'namespace', direction: 'asc' });
  const i18n = I18n.useContext();

  const Th = useCallback((props: { title: ReactNode, sortKey?: SortKey, isSticky?: boolean }) => {
    const handleColumnHeaderClick = () => {
      if (props.sortKey === undefined) {
        return;
      }

      if (sort.key === props.sortKey) {
        setSort({ key: props.sortKey, direction: sort.direction === 'asc' ? 'desc' : 'asc' });
      } else {
        setSort({ key: props.sortKey, direction: 'asc' });
      }
    }

    const style: React.CSSProperties = props.isSticky ? { position: 'sticky', left: 0, zIndex: 10 } : {};

    return (
      <th className={cts.Th} style={style} onClick={handleColumnHeaderClick}>
        <div className={props.sortKey === undefined ? '' : cts.SortableTh}>
          {props.title}

          {sort.key === props.sortKey && (
            <div className={cts.SortableThIcon}>
              <SvgIcon svg={sort.direction === 'asc' ? arrowUpIcon : arrowDownIcon} />
            </div>
          )}
        </div>
      </th>
    );
  }, [sort.direction, sort.key])

  const { data: namespaces, error: namespacesError } = useSWR(
    swrKeys.pulsar.tenants.tenant.namespaces._({ tenant: props.tenant }),
    async () => {
      const req = new pb.GetNamespacesRequest();
      req.setTenant(props.tenant);
      const res = await namespaceServiceClient.getNamespaces(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get namespaces: ${res.getStatus()?.getMessage()}`);
        return;
      }

      return res.getNamespacesList().map(tn => tn.split('/')[1]);
    }
  );
  if (namespacesError) {
    notifyError(`Unable to get namespaces list. ${namespacesError}`);
  }

  const { data: metrics, error: metricsError } = useSWR(
    swrKeys.pulsar.customApi.metrics.allTenantNamespaces._(props.tenant),
    async () => {
      const req = new GetNamespacesMetricsRequest();
      req.setNamespacesList(namespaces?.map(ns => `${props.tenant}/${ns}`) || []);
      const res = await metricsServiceClient.getNamespacesMetrics(req, {}).catch(err => notifyError(`Unable to get namespaces metrics. ${err}`));
      if (res === undefined) {
        return;
      }
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get namespaces metrics. ${res.getStatus()?.getMessage()}`);
        return;
      }

      return metricsFromPb(res);
    },
    { refreshInterval: 3 * 1000 }
  );
  if (metricsError) {
    notifyError(`Unable to get namespaces metrics. ${metricsError}`);
  }

  const { data: topicsCount, error: topicsCountError } = useSWR(
    itemsRenderedDebounced.length === 0 ? null : swrKeys.pulsar.batch.getTenantNamespacesTopicsCount._(props.tenant, itemsRendered.map(item => item.data!)),
    async () => ({})
  );

  if (topicsCountError) {
    notifyError(`Unable to get namespaces topics count. ${topicsCountError}`);
  }

  useEffect(() => {
    // Avoid visual blinking after each namespace topics count update request.
    setNamespaceTopicsCountCache(namespacesTopicsCountCache => ({ ...namespacesTopicsCountCache, ...topicsCount }));
  }, [topicsCount]);

  const sortedNamespaces = useMemo(() => sortNamespaces(
    namespaces || [],
    sort, {
    namespacesTopicsCount: topicsCount || {},
    metrics: metrics || {},
  }),
    [namespaces, sort, topicsCount, metrics]
  );

  const namespacesToShow = sortedNamespaces?.filter((t) => t.includes(filterQueryDebounced));
  const namespacesToShowMetrics = useMemo(
    () => _(metrics).toPairs().filter(([ns]) => namespacesToShow.includes(ns)).fromPairs().value(),
    [metrics, namespacesToShow]
  );

  return (
    <div className={s.Namespaces}>
      <div className={s.Toolbar}>
        <div className={s.FilterInput}>
          <Input value={filterQuery} onChange={(v) => setFilterQuery(v)} placeholder="Namespace" focusOnMount={true} clearable={true} />
        </div>
        <div>
          <strong>{namespacesToShow.length}</strong> <span style={{ fontWeight: 'normal' }}>of</span> <strong>{namespaces?.length}</strong> namespaces.
        </div>
      </div>

      {(namespacesToShow || []).length === 0 && (
        <div className={cts.NothingToShow}>
          Nothing to show.
        </div>
      )}
      {(namespacesToShow || []).length > 0 && (
        <div className={cts.Table} ref={tableRef}>
          <TableVirtuoso
            data={namespacesToShow}
            overscan={{ main: (tableRef?.current?.clientHeight || 0), reverse: (tableRef?.current?.clientHeight || 0) }}
            fixedHeaderContent={() => (
              <>
                <tr>
                  <Th title="Namespaces" sortKey="namespace" isSticky={true} />
                  <Th title={<TopicIcon topicType='persistent' />} />
                  <Th title={<TopicIcon topicType='non-persistent' />} />
                  <Th title="Msg. rate in" sortKey="inRate" />
                  <Th title="Msg. throughput in" sortKey="inTpRate" />
                  <Th title="Msg. rate out" sortKey="outRate" />
                  <Th title="Msg. throughput out" sortKey="outTpRate" />
                  <Th title="Max replication delay sec." sortKey="maxReplicationDelaySecond" />
                  <Th title="Msg. backlog" sortKey="msgBacklog" />
                  <Th title={<ConsumerIcon />} sortKey="noOfConsumers" />
                  <Th title={<ProducerIcon />} sortKey="noOfProducers" />
                  <Th title={<SubscriptionIcon />} sortKey="noOfSubscriptions" />
                  <Th title="Storage size" sortKey="storageSize" />
                  <Th title="Replicators" sortKey="noOrReplicators" />
                  <Th title="Replication backlog" sortKey="replicationBacklog" />
                </tr>
                <tr>
                  <th className={cts.SummaryTh} style={{ position: 'sticky', left: 0, zIndex: 10 }}>Summary</th>
                  <th className={cts.SummaryTh}><NoData /></th>
                  <th className={cts.SummaryTh}><NoData /></th>
                  <th className={cts.SummaryTh}>{i18n.formatCountRate(sum(namespacesToShowMetrics, 'inRate'))}</th>
                  <th className={cts.SummaryTh}>{i18n.formatCountRate(sum(namespacesToShowMetrics, 'inTpRate'))}</th>
                  <th className={cts.SummaryTh}>{i18n.formatCount(sum(namespacesToShowMetrics, 'outRate'))}</th>
                  <th className={cts.SummaryTh}>{i18n.formatBytes(sum(namespacesToShowMetrics, 'outTpRate'))}</th>
                  <th className={cts.SummaryTh}>{i18n.formatCountRate(sum(namespacesToShowMetrics, 'maxReplicationDelaySecond'))}</th>
                  <th className={cts.SummaryTh}>{i18n.formatCountRate(sum(namespacesToShowMetrics, 'msgBacklog'))}</th>
                  <th className={cts.SummaryTh}>{i18n.formatCount(sum(namespacesToShowMetrics, 'noOfConsumers'))}</th>
                  <th className={cts.SummaryTh}>{i18n.formatCount(sum(namespacesToShowMetrics, 'noOfProducers'))}</th>
                  <th className={cts.SummaryTh}>{i18n.formatBytes(sum(namespacesToShowMetrics, 'noOfSubscriptions'))}</th>
                  <th className={cts.SummaryTh}>{i18n.formatBytes(sum(namespacesToShowMetrics, 'storageSize'))}</th>
                  <th className={cts.SummaryTh}>{i18n.formatBytes(sum(namespacesToShowMetrics, 'noOfReplicators'))}</th>
                  <th className={cts.SummaryTh}>{i18n.formatBytes(sum(namespacesToShowMetrics, 'replicationBacklog'))}</th>
                </tr>
              </>
            )}
            itemContent={(_, namespace) => {
              const namespaceMetrics = metrics === undefined ? undefined : metrics[namespace];
              return (
                <Namespace
                  tenant={props.tenant}
                  namespace={namespace}
                  metrics={namespaceMetrics}
                  persistentTopicsCount={namespaceTopicsCountCache[namespace]?.persistent}
                  nonPersistentTopicsCount={namespaceTopicsCountCache[namespace]?.nonPersistent}
                  highlight={{ namespace: [filterQueryDebounced] }}
                />
              );
            }}
            customScrollParent={tableRef.current || undefined}
            totalCount={namespacesToShow?.length}
            itemsRendered={(items) => {
              const isShouldUpdate = !isEqual(itemsRendered, items)
              if (isShouldUpdate) {
                setItemsRendered(() => items);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}

type TdProps = { children: React.ReactNode, width?: string } & React.ThHTMLAttributes<HTMLTableCellElement>;
const Td: React.FC<TdProps> = (props) => {
  const { children, ...restProps } = props;
  return <td className={cts.Td} {...restProps}>
    <div style={{ width: props.width, overflow: 'hidden', textOverflow: 'ellipsis' }} >
      {children}
    </div>
  </td>;
};

type NamespaceProps = {
  tenant: string;
  namespace: string;
  metrics: NamespaceMetrics | undefined;
  persistentTopicsCount: number | undefined;
  nonPersistentTopicsCount: number | undefined;
  highlight: {
    namespace: string[];
  }
}
const Namespace: React.FC<NamespaceProps> = (props) => {
  const i18n = I18n.useContext();

  return (
    <>
      <Td width={firstColumnWidth} title={props.namespace} style={{ position: 'sticky', left: 0, zIndex: 1 }}>
        <Link to={routes.tenants.tenant.namespaces.namespace.topics._.get({ tenant: props.tenant, namespace: props.namespace })} className="A">
          <Highlighter
            highlightClassName="highlight-substring"
            searchWords={props.highlight.namespace}
            autoEscape={true}
            textToHighlight={props.namespace}
          />
        </Link>
      </Td>
      <Td width="4ch" title={`${props.persistentTopicsCount?.toString()} persistent topics`}>
        {props.persistentTopicsCount !== undefined && <span className={cts.LazyContent}>{props.persistentTopicsCount}</span>}
      </Td>
      <Td width="4ch" title={`${props.nonPersistentTopicsCount?.toString()} non-persistent topics`}>
        {props.nonPersistentTopicsCount !== undefined && <span className={cts.LazyContent}>{props.nonPersistentTopicsCount}</span>}
      </Td>
      <Td width="12ch">{props.metrics?.inRate === undefined ? <NoData /> : i18n.formatCountRate(props.metrics.inRate)}</Td>
      <Td width="12ch">{props.metrics?.inTpRate === undefined ? <NoData /> : i18n.formatCountRate(props.metrics.inTpRate)}</Td>
      <Td width="12ch">{props.metrics?.outRate === undefined ? <NoData /> : i18n.formatBytes(props.metrics.outRate)}</Td>
      <Td width="12ch">{props.metrics?.outTpRate === undefined ? <NoData /> : i18n.formatCount(props.metrics.outTpRate)}</Td>
      <Td width="18ch">{props.metrics?.maxReplicationDelaySecond === undefined ? <NoData /> : i18n.formatCountRate(props.metrics.maxReplicationDelaySecond)}</Td>
      <Td width="18ch">{props.metrics?.msgBacklog === undefined ? <NoData /> : i18n.formatCountRate(props.metrics.msgBacklog)}</Td>
      <Td width="12ch">{props.metrics?.noOfConsumers === undefined ? <NoData /> : i18n.formatCount(props.metrics.noOfConsumers)}</Td>
      <Td width="12ch">{props.metrics?.noOfProducers === undefined ? <NoData /> : i18n.formatCount(props.metrics.noOfProducers)}</Td>
      <Td width="12ch">{props.metrics?.noOfSubscriptions === undefined ? <NoData /> : i18n.formatBytes(props.metrics.noOfSubscriptions)}</Td>
      <Td width="12ch">{props.metrics?.storageSize === undefined ? <NoData /> : i18n.formatBytes(props.metrics.storageSize)}</Td>
      <Td width="12ch">{props.metrics?.noOfReplicators === undefined ? <NoData /> : i18n.formatBytes(props.metrics.noOfReplicators)}</Td>
      <Td width="12ch">{props.metrics?.replicationBacklog === undefined ? <NoData /> : i18n.formatBytes(props.metrics.replicationBacklog)}</Td>
    </>
  );
}

const sortNamespaces = (tenants: string[], sort: Sort, data: {
  namespacesTopicsCount: Record<string, { persistent: number, nonPersistent: number }>
  metrics: Record<string, NamespaceMetrics | undefined>
}): string[] => {

  function s(defs: string[], undefs: string[], getM: (m: NamespaceMetrics | undefined) => number): string[] {
    let result = defs.sort((a, b) => {
      const aMetrics = data.metrics[a];
      const bMetrics = data.metrics[b];
      return getM(aMetrics) - getM(bMetrics);
    });
    result = sort.direction === 'asc' ? result : result.reverse();
    return result.concat(undefs);
  }

  if (sort.key === 'namespace') {
    const t = tenants.sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
    return sort.direction === 'asc' ? t : t.reverse();
  }

  if (sort.key === 'inRate') {
    const [defs, undefs] = partition(tenants, (t) => data.metrics[t]?.inRate !== undefined);
    return s(defs, undefs, (m) => m?.inRate!);
  }

  if (sort.key === 'inTpRate') {
    const [defs, undefs] = partition(tenants, (t) => data.metrics[t]?.inTpRate !== undefined);
    return s(defs, undefs, (m) => m?.inTpRate!);
  }

  if (sort.key === 'maxReplicationDelaySecond') {
    const [defs, undefs] = partition(tenants, (t) => data.metrics[t]?.maxReplicationDelaySecond !== undefined);
    return s(defs, undefs, (m) => m?.maxReplicationDelaySecond!);
  }

  if (sort.key === 'msgBacklog') {
    const [defs, undefs] = partition(tenants, (t) => data.metrics[t]?.msgBacklog !== undefined);
    return s(defs, undefs, (m) => m?.msgBacklog!);
  }

  if (sort.key === 'noOfConsumers') {
    const [defs, undefs] = partition(tenants, (t) => data.metrics[t]?.noOfConsumers !== undefined);
    return s(defs, undefs, (m) => m?.noOfConsumers!);
  }

  if (sort.key === 'noOfProducers') {
    const [defs, undefs] = partition(tenants, (t) => data.metrics[t]?.noOfProducers !== undefined);
    return s(defs, undefs, (m) => m?.noOfProducers!);
  }

  if (sort.key === 'noOrReplicators') {
    const [defs, undefs] = partition(tenants, (t) => data.metrics[t]?.noOfReplicators !== undefined);
    return s(defs, undefs, (m) => m?.noOfReplicators!);
  }

  if (sort.key === 'noOfSubscriptions') {
    const [defs, undefs] = partition(tenants, (t) => data.metrics[t]?.noOfSubscriptions !== undefined);
    return s(defs, undefs, (m) => m?.noOfSubscriptions!);
  }

  if (sort.key === 'outRate') {
    const [defs, undefs] = partition(tenants, (t) => data.metrics[t]?.outRate !== undefined);
    return s(defs, undefs, (m) => m?.outRate!);
  }

  if (sort.key === 'outTpRate') {
    const [defs, undefs] = partition(tenants, (t) => data.metrics[t]?.outTpRate !== undefined);
    return s(defs, undefs, (m) => m?.outTpRate!);
  }

  if (sort.key === 'replicationBacklog') {
    const [defs, undefs] = partition(tenants, (t) => data.metrics[t]?.replicationBacklog !== undefined);
    return s(defs, undefs, (m) => m?.replicationBacklog!);
  }

  if (sort.key === 'storageSize') {
    const [defs, undefs] = partition(tenants, (t) => data.metrics[t]?.storageSize !== undefined);
    return s(defs, undefs, (m) => m?.storageSize!);
  }

  return tenants;
}

const NoData = () => {
  return <div className={cts.NoData}>-</div>
}

function sum(metrics: Record<string, NamespaceMetrics | undefined>, key: keyof NamespaceMetrics): number {
  return Object.values(metrics).reduce((summary, curr) => {
    if (curr === undefined) {
      return summary;
    }

    const val = curr[key];
    return typeof val === 'number' ? summary + (val || 0) : summary;
  }, 0);
};

export default Namespaces;
