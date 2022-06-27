import React, { useCallback, useEffect, useMemo, useState } from 'react';
import s from './Namespaces.module.css'
import cts from "../../ui/ChildrenTable/ChildrenTable.module.css";
import arrowDownIcon from '!!raw-loader!../../ui/ChildrenTable/arrow-down.svg';
import arrowUpIcon from '!!raw-loader!../../ui/ChildrenTable/arrow-up.svg';
import SvgIcon from '../../ui/SvgIcon/SvgIcon';
import * as PulsarAdminClient from '../../app/contexts/PulsarAdminClient';
import * as PulsarAdminBatchClient from '../../app/contexts/PulsarAdminBatchClient/PulsarAdminBatchClient';
import * as PulsarCustomApiClient from '../../app/contexts/PulsarCustomApiClient/PulsarCustomApiClient';
import * as Notifications from '../../app/contexts/Notifications';
import * as I18n from '../../app/contexts/I18n/I18n';
import useSWR from 'swr';
import { swrKeys } from '../../swrKeys';
import { ListItem, TableVirtuoso } from 'react-virtuoso';
import { NamespaceMetrics } from 'tealtools-pulsar-ui-api/metrics/types';
import { isEqual, partition } from 'lodash';
import Highlighter from "react-highlight-words";
import LinkWithQuery from '../../ui/LinkWithQuery/LinkWithQuery';
import { routes } from '../../routes';
import { TopicIcon } from '../../ui/Icons/Icons';
import Input from '../../ui/Input/Input';
import { useDebounce } from 'use-debounce';
import { useRef } from 'react';
import _ from 'lodash';

type SortKey =
  'tenant' |
  'averageMsgSize' |
  'backlogSize' |
  'bytesInCount' |
  'bytesOutCount' |
  'msgInCount' |
  'msgOutCount' |
  'msgRateIn' |
  'msgRateOut' |
  'msgThroughputIn' |
  'msgThroughputOut' |
  'pendingAddEntriesCount' |
  'producerCount' |
  'storageSize';

type Sort = { key: SortKey, direction: 'asc' | 'desc' };

const firstColumnWidth = '15ch';

type NamespacesProps = {
  tenant: string;
}

const Namespaces: React.FC<NamespacesProps> = (props) => {
  const tableRef = useRef<HTMLDivElement>(null);
  const adminClient = PulsarAdminClient.useContext().client;
  const adminBatchClient = PulsarAdminBatchClient.useContext().client;
  const customApiClient = PulsarCustomApiClient.useContext().client;
  const { notifyError } = Notifications.useContext();
  const [filterQuery, setFilterQuery] = useState('');
  const [filterQueryDebounced] = useDebounce(filterQuery, 400);
  const [itemsRendered, setItemsRendered] = useState<ListItem<string>[]>([]);
  const [itemsRenderedDebounced] = useDebounce(itemsRendered, 400);
  const [namespaceTopicsCountCache, setNamespaceTopicsCountCache] = useState<Record<string, { persistent: number, nonPersistent: number }>>({});
  const [sort, setSort] = useState<Sort>({ key: 'tenant', direction: 'asc' });
  const i18n = I18n.useContext();

  const Th = useCallback((props: { title: React.ReactNode, sortKey?: SortKey, isSticky?: boolean }) => {
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
    async () => (await adminClient.namespaces.getTenantNamespaces(props.tenant)).map(tn => tn.split('/')[1]),
  );
  if (namespacesError) {
    notifyError(`Unable to get namespaces list. ${namespacesError}`);
  }

  const { data: allNamespacesMetrics, error: allNamespacesMetricsError } = useSWR(
    swrKeys.pulsar.customApi.metrics.allTenantNamespaces._(props.tenant),
    async () => await customApiClient.getAllTenantNamespacesMetrics(props.tenant),
  );
  if (allNamespacesMetricsError) {
    notifyError(`Unable to get all namespaces metrics. ${allNamespacesMetricsError}`);
  }

  const { data: namespacesTopicsCount, error: namespacesTopicsCountError } = useSWR(
    itemsRenderedDebounced.length === 0 ? null : swrKeys.pulsar.batch.getTenantNamespacesTopicsCount._(props.tenant, itemsRendered.map(item => item.data!)),
    async () => await adminBatchClient?.getTenantNamespacesTopicsCount(props.tenant, itemsRendered.map(item => item.data!)),
  );

  if (namespacesTopicsCountError) {
    notifyError(`Unable to get namespaces topics count. ${namespacesTopicsCountError}`);
  }

  useEffect(() => {
    // Avoid visual blinking after each namespace topics count update request.
    setNamespaceTopicsCountCache(namespacesTopicsCountCache => ({ ...namespacesTopicsCountCache, ...namespacesTopicsCount }));
  }, [namespacesTopicsCount]);

  const sortedNamespaces = useMemo(() => sortNamespaces(
    namespaces || [],
    sort, {
    namespacesTopicsCount: namespacesTopicsCount || {},
    allNamespacesMetrics: allNamespacesMetrics || {},
  }),
    [namespaces, sort, namespacesTopicsCount, allNamespacesMetrics]
  );

  const namespacesToShow = sortedNamespaces?.filter((t) => t.includes(filterQueryDebounced));
  const namespacesToShowMetrics = useMemo(() => _(allNamespacesMetrics).toPairs().filter(([k]) => namespacesToShow.includes(k)).fromPairs().value(), [allNamespacesMetrics, namespacesToShow]);

  return (
    <div className={s.Namespaces}>
      <div className={s.Toolbar}>
        <div className={s.FilterInput}>
          <Input value={filterQuery} onChange={(v) => setFilterQuery(v)} placeholder="namespace-name" focusOnMount={true} clearable={true} />
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
                  <Th title="Namespaces" sortKey="tenant" isSticky={true} />
                  <Th title={<TopicIcon topicType='persistent' />} />
                  <Th title={<TopicIcon topicType='non-persistent' />} />
                  <Th title="Msg. rate in" sortKey="msgRateIn" />
                  <Th title="Msg. rate out" sortKey="msgRateOut" />
                  <Th title="Msg. throughput in" sortKey="msgThroughputIn" />
                  <Th title="Msg. throughput out" sortKey="msgThroughputOut" />
                  <Th title="Msg. in" sortKey="msgInCount" />
                  <Th title="Msg. out" sortKey="msgOutCount" />
                  <Th title="Avg. msg. size" sortKey="averageMsgSize" />
                  <Th title="Bytes in" sortKey="bytesInCount" />
                  <Th title="Bytes out" sortKey="bytesOutCount" />
                  <Th title="Producers" sortKey="producerCount" />
                  <Th title="Pending entries" sortKey="pendingAddEntriesCount" />
                  <Th title="Backlog size" sortKey="backlogSize" />
                  <Th title="Storage size" sortKey="storageSize" />
                </tr>
                <tr>
                  <th className={cts.SummaryTh} style={{ position: 'sticky', left: 0, zIndex: 10 }}>Summary</th>
                  <th className={cts.SummaryTh}><NoData /></th>
                  <th className={cts.SummaryTh}><NoData /></th>
                  <th className={cts.SummaryTh}>{i18n.formatCountRate(sum(namespacesToShowMetrics, 'msgRateIn'))}</th>
                  <th className={cts.SummaryTh}>{i18n.formatCountRate(sum(namespacesToShowMetrics, 'msgRateOut'))}</th>
                  <th className={cts.SummaryTh}>{i18n.formatCountRate(sum(namespacesToShowMetrics, 'msgThroughputIn'))}</th>
                  <th className={cts.SummaryTh}>{i18n.formatCountRate(sum(namespacesToShowMetrics, 'msgThroughputOut'))}</th>
                  <th className={cts.SummaryTh}>{i18n.formatCount(sum(namespacesToShowMetrics, 'msgInCount'))}</th>
                  <th className={cts.SummaryTh}>{i18n.formatCount(sum(namespacesToShowMetrics, 'msgOutCount'))}</th>
                  <th className={cts.SummaryTh}>{i18n.formatBytes(Object.keys(namespacesToShowMetrics).length > 0 ? sum(namespacesToShowMetrics, 'averageMsgSize') / Object.keys(namespacesToShowMetrics).length : 0)}</th>
                  <th className={cts.SummaryTh}>{i18n.formatBytes(sum(namespacesToShowMetrics, 'bytesInCount'))}</th>
                  <th className={cts.SummaryTh}>{i18n.formatBytes(sum(namespacesToShowMetrics, 'bytesOutCount'))}</th>
                  <th className={cts.SummaryTh}>{i18n.formatCount(sum(namespacesToShowMetrics, 'producerCount'))}</th>
                  <th className={cts.SummaryTh}>{i18n.formatCount(sum(namespacesToShowMetrics, 'pendingAddEntriesCount'))}</th>
                  <th className={cts.SummaryTh}>{i18n.formatBytes(sum(namespacesToShowMetrics, 'backlogSize'))}</th>
                  <th className={cts.SummaryTh}>{i18n.formatBytes(sum(namespacesToShowMetrics, 'storageSize'))}</th>
                </tr>
              </>
            )}
            itemContent={(_, namespace) => {
              const namespaceMetrics = allNamespacesMetrics === undefined ? {} : allNamespacesMetrics[namespace] || {};
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
  metrics: NamespaceMetrics;
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
        <LinkWithQuery to={routes.tenants.tenant.namespaces.namespace._.get({ tenant: props.tenant, namespace: props.namespace })}>
          <Highlighter
            highlightClassName="highlight-substring"
            searchWords={props.highlight.namespace}
            autoEscape={true}
            textToHighlight={props.namespace}
          />
        </LinkWithQuery>
      </Td>
      <Td width="4ch" title={`${props.persistentTopicsCount?.toString()} persistent topics`}>
        {props.persistentTopicsCount !== undefined && <span className={cts.LazyContent}>{props.persistentTopicsCount}</span>}
      </Td>
      <Td width="4ch" title={`${props.nonPersistentTopicsCount?.toString()} non-persistent topics`}>
        {props.nonPersistentTopicsCount !== undefined && <span className={cts.LazyContent}>{props.nonPersistentTopicsCount}</span>}
      </Td>
      <Td width="12ch">{props.metrics?.msgRateIn === undefined ? <NoData /> : i18n.formatCountRate(props.metrics.msgRateIn)}</Td>
      <Td width="12ch">{props.metrics?.msgRateOut === undefined ? <NoData /> : i18n.formatCountRate(props.metrics.msgRateOut)}</Td>
      <Td width="18ch">{props.metrics?.msgThroughputIn === undefined ? <NoData /> : i18n.formatCountRate(props.metrics.msgThroughputIn)}</Td>
      <Td width="18ch">{props.metrics?.msgThroughputOut === undefined ? <NoData /> : i18n.formatCountRate(props.metrics.msgThroughputOut)}</Td>
      <Td width="12ch">{props.metrics?.msgInCount === undefined ? <NoData /> : i18n.formatCount(props.metrics.msgInCount)}</Td>
      <Td width="12ch">{props.metrics?.msgOutCount === undefined ? <NoData /> : i18n.formatCount(props.metrics.msgOutCount)}</Td>
      <Td width="12ch">{props.metrics?.averageMsgSize === undefined ? <NoData /> : i18n.formatBytes(props.metrics.averageMsgSize)}</Td>
      <Td width="12ch">{props.metrics?.bytesInCount === undefined ? <NoData /> : i18n.formatBytes(props.metrics.bytesInCount)}</Td>
      <Td width="12ch">{props.metrics?.bytesOutCount === undefined ? <NoData /> : i18n.formatBytes(props.metrics.bytesOutCount)}</Td>
      <Td width="12ch">{props.metrics?.producerCount === undefined ? <NoData /> : i18n.formatCount(props.metrics.producerCount)}</Td>
      <Td width="12ch">{props.metrics?.pendingAddEntriesCount === undefined ? <NoData /> : i18n.formatCount(props.metrics.pendingAddEntriesCount)}</Td>
      <Td width="12ch">{props.metrics?.backlogSize === undefined ? <NoData /> : i18n.formatCount(props.metrics.backlogSize)}</Td>
      <Td width="12ch">{props.metrics?.storageSize === undefined ? <NoData /> : i18n.formatBytes(props.metrics.storageSize)}</Td>
    </>
  );
}

const sortNamespaces = (tenants: string[], sort: Sort, data: {
  namespacesTopicsCount: Record<string, { persistent: number, nonPersistent: number }>
  allNamespacesMetrics: Record<string, NamespaceMetrics>
}): string[] => {
  function s(defs: string[], undefs: string[], getM: (m: NamespaceMetrics) => number): string[] {
    let result = defs.sort((a, b) => {
      const aMetrics = data.allNamespacesMetrics[a];
      const bMetrics = data.allNamespacesMetrics[b];
      return getM(aMetrics) - getM(bMetrics);
    });
    result = sort.direction === 'asc' ? result : result.reverse();
    return result.concat(undefs);
  }

  if (sort.key === 'tenant') {
    const t = tenants.sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
    return sort.direction === 'asc' ? t : t.reverse();
  }

  if (sort.key === 'averageMsgSize') {
    const [defs, undefs] = partition(tenants, (t) => data.allNamespacesMetrics[t]?.averageMsgSize !== undefined);
    return s(defs, undefs, (m) => m.averageMsgSize!);
  }

  if (sort.key === 'backlogSize') {
    const [defs, undefs] = partition(tenants, (t) => data.allNamespacesMetrics[t]?.backlogSize !== undefined);
    return s(defs, undefs, (m) => m.backlogSize!);
  }

  if (sort.key === 'bytesInCount') {
    const [defs, undefs] = partition(tenants, (t) => data.allNamespacesMetrics[t]?.bytesInCount !== undefined);
    return s(defs, undefs, (m) => m.bytesInCount!);
  }

  if (sort.key === 'bytesOutCount') {
    const [defs, undefs] = partition(tenants, (t) => data.allNamespacesMetrics[t]?.bytesOutCount !== undefined);
    return s(defs, undefs, (m) => m.bytesOutCount!);
  }

  if (sort.key === 'msgInCount') {
    const [defs, undefs] = partition(tenants, (t) => data.allNamespacesMetrics[t]?.msgInCount !== undefined);
    return s(defs, undefs, (m) => m.msgInCount!);
  }

  if (sort.key === 'msgOutCount') {
    const [defs, undefs] = partition(tenants, (t) => data.allNamespacesMetrics[t]?.msgOutCount !== undefined);
    return s(defs, undefs, (m) => m.msgOutCount!);
  }

  if (sort.key === 'msgRateIn') {
    const [defs, undefs] = partition(tenants, (t) => data.allNamespacesMetrics[t]?.msgRateIn !== undefined);
    return s(defs, undefs, (m) => m.msgRateIn!);
  }

  if (sort.key === 'msgRateOut') {
    const [defs, undefs] = partition(tenants, (t) => data.allNamespacesMetrics[t]?.msgRateOut !== undefined);
    return s(defs, undefs, (m) => m.msgRateOut!);
  }

  if (sort.key === 'msgThroughputIn') {
    const [defs, undefs] = partition(tenants, (t) => data.allNamespacesMetrics[t]?.msgThroughputIn !== undefined);
    return s(defs, undefs, (m) => m.msgThroughputIn!);
  }

  if (sort.key === 'msgThroughputOut') {
    const [defs, undefs] = partition(tenants, (t) => data.allNamespacesMetrics[t]?.msgThroughputOut !== undefined);
    return s(defs, undefs, (m) => m.msgThroughputOut!);
  }

  if (sort.key === 'pendingAddEntriesCount') {
    const [defs, undefs] = partition(tenants, (t) => data.allNamespacesMetrics[t]?.pendingAddEntriesCount !== undefined);
    return s(defs, undefs, (m) => m.pendingAddEntriesCount!);
  }

  if (sort.key === 'producerCount') {
    const [defs, undefs] = partition(tenants, (t) => data.allNamespacesMetrics[t]?.producerCount !== undefined);
    return s(defs, undefs, (m) => m.producerCount!);
  }

  if (sort.key === 'storageSize') {
    const [defs, undefs] = partition(tenants, (t) => data.allNamespacesMetrics[t]?.storageSize !== undefined);
    return s(defs, undefs, (m) => m.storageSize!);
  }

  return tenants;
}

const NoData = () => {
  return <div className={cts.NoData}>-</div>
}

function sum(metrics: Record<string, NamespaceMetrics>, key: keyof NamespaceMetrics): number {
  return Object.values(metrics).reduce((acc, cur) => acc + (cur[key] || 0), 0);
}

export default Namespaces;
