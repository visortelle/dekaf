import React, { useCallback, useEffect, useMemo, useState } from 'react';
import s from './Tenants.module.css'
import cts from "../../ui/ChildrenTable/ChildrenTable.module.css";
import arrowDownIcon from '../../ui/ChildrenTable/arrow-down.svg';
import arrowUpIcon from '../../ui/ChildrenTable/arrow-up.svg';
import SvgIcon from '../../ui/SvgIcon/SvgIcon';
import * as GrpcClient from '../../app/contexts/GrpcClient/GrpcClient'
import * as pb from '../../../grpc-web/tools/teal/pulsar/ui/tenant/v1/tenant_pb'
import * as Notifications from '../../app/contexts/Notifications';
import * as I18n from '../../app/contexts/I18n/I18n';
import useSWR from 'swr';
import { swrKeys } from '../../swrKeys';
import { ListItem, TableVirtuoso } from 'react-virtuoso';
import { isEqual, partition } from 'lodash';
import Highlighter from "react-highlight-words";
import Link from '../../ui/Link/Link';
import { routes } from '../../routes';
import { NamespaceIcon } from '../../ui/Icons/Icons';
import Input from '../../ui/Input/Input';
import { useDebounce } from 'use-debounce';
import { useRef } from 'react';
import _ from 'lodash';
import { Code } from '../../../grpc-web/google/rpc/code_pb';

export type TenantInfo = {
  allowedClusters: string[];
  adminRoles: string[];
}

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
  'storageSize';

type Sort = { key: SortKey, direction: 'asc' | 'desc' };

const firstColumnWidth = '15ch';

const Tenants: React.FC = () => {
  const tableRef = useRef<HTMLDivElement>(null);
  const { tenantServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const [filterQuery, setFilterQuery] = useState('');
  const [filterQueryDebounced] = useDebounce(filterQuery, 400);
  const [itemsRendered, setItemsRendered] = useState<ListItem<string>[]>([]);
  const [itemsRenderedDebounced] = useDebounce(itemsRendered, 400);
  const [tenantsNamespacesCountCache, setTenantsNamespacesCountCache] = useState<Record<string, number>>({});
  const [tenantsInfoCache, setTenantsInfoCache] = useState<Record<string, TenantInfo>>({});
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

  const { data: tenants, error: tenantsError } = useSWR(
    swrKeys.pulsar.tenants._(),
    async () => {
      const req = new pb.GetTenantsRequest();
      const res = await tenantServiceClient.getTenants(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get tenants: ${res.getStatus()?.getMessage()}`);
        return;
      }

      return res.getTenantsList();
    }
  );
  if (tenantsError) {
    notifyError(`Unable to get tenants: ${tenantsError}`);
  }

  const { data: allTenantsMetrics, error: allTenantsMetricsError } = useSWR(
    swrKeys.pulsar.customApi.metrics.allTenants._(),
    async () => {
      const v: Record<string, TenantMetrics> = {};
      return v;
    },
    { refreshInterval: 3 * 1000 }
  );
  if (allTenantsMetricsError) {
    notifyError(`Unable to get all tenants metrics. ${allTenantsMetricsError}`);
  }

  const { data: tenantsNamespacesCount, error: tenantsNamespacesCountError } = useSWR(
    itemsRenderedDebounced.length === 0 ? null : swrKeys.pulsar.batch.getTenantsNamespacesCount._(itemsRenderedDebounced.map(item => item.data!)),
    async () => ({}),
  );

  if (tenantsNamespacesCountError) {
    notifyError(`Unable to get tenants namespaces count. ${tenantsNamespacesCountError}`);
  }

  useEffect(() => {
    // Avoid visual blinking after each tenants namespaces count update request.
    setTenantsNamespacesCountCache(tenantsNamespacesCountCache => ({ ...tenantsNamespacesCountCache, ...tenantsNamespacesCount }));
  }, [tenantsNamespacesCount]);

  const { data: tenantsInfo, error: tenantsInfoError } = useSWR(
    itemsRenderedDebounced.length === 0 ? null : swrKeys.pulsar.batch.getTenantsInfo._(itemsRenderedDebounced.map(item => item.data!)),
    async () => ({})
  );

  if (tenantsInfoError) {
    notifyError(`Unable to get tenants info. ${tenantsInfoError}`);
  }

  useEffect(() => {
    // Avoid visual blinking after each tenants info update request.
    setTenantsInfoCache(tenantsInfoCache => ({ ...tenantsInfoCache, ...tenantsInfo }));
  }, [tenantsInfo]);


  const sortedTenants = useMemo(() => sortTenants(
    tenants || [],
    sort, {
    tenantsNamespacesCount: tenantsNamespacesCount || {},
    allTenantsMetrics: allTenantsMetrics || {},
  }),
    [tenants, sort, tenantsNamespacesCount, allTenantsMetrics]
  );

  const tenantsToShow = sortedTenants?.filter((t) => t.includes(filterQueryDebounced));
  const tenantsToShowMetrics = useMemo(() => _(allTenantsMetrics).toPairs().filter(([k]) => tenantsToShow.includes(k)).fromPairs().value(), [allTenantsMetrics, tenantsToShow]);

  return (
    <div className={s.Tenants}>
      <div className={s.Toolbar}>
        <div className={s.FilterInput}>
          <Input value={filterQuery} onChange={(v) => setFilterQuery(v)} placeholder="tenant-name" focusOnMount={true} clearable={true} />
        </div>
        <div>
          <strong>{tenantsToShow.length}</strong> <span style={{ fontWeight: 'normal' }}>of</span> <strong>{tenants?.length}</strong> tenants.
        </div>
      </div>

      {(tenantsToShow || []).length === 0 && (
        <div className={cts.NothingToShow}>
          Nothing to show.
        </div>
      )}
      {(tenantsToShow || []).length > 0 && (
        <div className={cts.Table} ref={tableRef}>
          <TableVirtuoso
            data={tenantsToShow}
            overscan={{ main: (tableRef?.current?.clientHeight || 0), reverse: (tableRef?.current?.clientHeight || 0) }}
            fixedHeaderContent={() => (
              <>
                <tr>
                  <Th title="Tenants" sortKey="tenant" isSticky={true} />
                  <Th title={<NamespaceIcon />} />
                  <Th title="Allowed clusters" />
                  <Th title="Admin roles" />
                  <Th title="Msg. rate in" sortKey="msgRateIn" />
                  <Th title="Msg. rate out" sortKey="msgRateOut" />
                  <Th title="Msg. throughput in" sortKey="msgThroughputIn" />
                  <Th title="Msg. throughput out" sortKey="msgThroughputOut" />
                  <Th title="Msg. in" sortKey="msgInCount" />
                  <Th title="Msg. out" sortKey="msgOutCount" />
                  <Th title="Avg. msg. size" sortKey="averageMsgSize" />
                  <Th title="Bytes in" sortKey="bytesInCount" />
                  <Th title="Bytes out" sortKey="bytesOutCount" />
                  <Th title="Pending entries" sortKey="pendingAddEntriesCount" />
                  <Th title="Backlog size" sortKey="backlogSize" />
                  <Th title="Storage size" sortKey="storageSize" />
                </tr>
                <tr>
                  <th className={cts.SummaryTh} style={{ position: 'sticky', left: 0, zIndex: 10 }}>Summary</th>
                  <th className={cts.SummaryTh}><NoData /></th>
                  <th className={cts.SummaryTh}><NoData /></th>
                  <th className={cts.SummaryTh}><NoData /></th>
                  <th className={cts.SummaryTh}>{i18n.formatCountRate(sum(tenantsToShowMetrics, 'msgRateIn'))}</th>
                  <th className={cts.SummaryTh}>{i18n.formatCountRate(sum(tenantsToShowMetrics, 'msgRateOut'))}</th>
                  <th className={cts.SummaryTh}>{i18n.formatCountRate(sum(tenantsToShowMetrics, 'msgThroughputIn'))}</th>
                  <th className={cts.SummaryTh}>{i18n.formatCountRate(sum(tenantsToShowMetrics, 'msgThroughputOut'))}</th>
                  <th className={cts.SummaryTh}>{i18n.formatCount(sum(tenantsToShowMetrics, 'msgInCount'))}</th>
                  <th className={cts.SummaryTh}>{i18n.formatCount(sum(tenantsToShowMetrics, 'msgOutCount'))}</th>
                  <th className={cts.SummaryTh}>{i18n.formatBytes(Object.keys(tenantsToShowMetrics).length > 0 ? sum(tenantsToShowMetrics, 'averageMsgSize') / Object.keys(tenantsToShowMetrics).length : 0)}</th>
                  <th className={cts.SummaryTh}>{i18n.formatBytes(sum(tenantsToShowMetrics, 'bytesInCount'))}</th>
                  <th className={cts.SummaryTh}>{i18n.formatBytes(sum(tenantsToShowMetrics, 'bytesOutCount'))}</th>
                  <th className={cts.SummaryTh}>{i18n.formatCount(sum(tenantsToShowMetrics, 'pendingAddEntriesCount'))}</th>
                  <th className={cts.SummaryTh}>{i18n.formatBytes(sum(tenantsToShowMetrics, 'backlogSize'))}</th>
                  <th className={cts.SummaryTh}>{i18n.formatBytes(sum(tenantsToShowMetrics, 'storageSize'))}</th>
                </tr>
              </>
            )}
            itemContent={(_, tenant) => {
              const tenantMetrics = (allTenantsMetrics || {})[tenant];
              return (
                <Tenant
                  tenant={tenant}
                  metrics={tenantMetrics}
                  namespacesCount={tenantsNamespacesCountCache[tenant]}
                  tenantInfo={tenantsInfoCache[tenant]}
                  highlight={{ tenant: [filterQueryDebounced] }}
                />
              );
            }}
            customScrollParent={tableRef.current || undefined}
            totalCount={tenantsToShow?.length}
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

type TenantProps = {
  tenant: string;
  metrics: TenantMetrics;
  namespacesCount: number | undefined;
  tenantInfo: TenantInfo | undefined;
  highlight: {
    tenant: string[];
  }
}
const Tenant: React.FC<TenantProps> = (props) => {
  const i18n = I18n.useContext();

  const Td = useCallback((props: { children: React.ReactNode, width: string } & React.TdHTMLAttributes<HTMLTableCellElement>) => {
    const { children, ...restProps } = props;
    return <td className={cts.Td} {...restProps}>
      <div style={{ width: props.width, overflow: 'hidden', textOverflow: 'ellipsis' }} >
        {children}
      </div>
    </td>;
  }, []);

  return (
    <>
      <Td width={firstColumnWidth} title={props.tenant} style={{ position: 'sticky', left: 0 }}>
        <Link to={routes.tenants.tenant.namespaces._.get({ tenant: props.tenant })} className="A">
          <Highlighter
            highlightClassName="highlight-substring"
            searchWords={props.highlight.tenant}
            autoEscape={true}
            textToHighlight={props.tenant}
          />
        </Link>
      </Td>
      <Td width="4ch" title={`${props.namespacesCount?.toString()} namespaces`}>
        {props.namespacesCount !== undefined && <span className={cts.LazyContent}>{props.namespacesCount}</span>}
      </Td>
      <Td width="24ch">
        {props.tenantInfo !== undefined && (
          <div className={cts.LazyContent}>
            {props.tenantInfo.allowedClusters.length === 0 ?
              <NoData /> :
              props.tenantInfo.allowedClusters.sort((a, b) => a.localeCompare(b, 'en', { numeric: true })).map((c) => <div key={c} className={cts.Badge} title={c}>{c}</div>)
            }
          </div>
        )}
      </Td>
      <Td width="24ch">
        {props.tenantInfo !== undefined && (
          <div className={cts.LazyContent}>
            {props.tenantInfo.adminRoles.length === 0 ?
              <NoData /> :
              props.tenantInfo?.adminRoles.sort((a, b) => a.localeCompare(b, 'en', { numeric: true })).map((r) => <div key={r} className={cts.Badge} title={r}>{r}</div>)
            }
          </div>
        )}
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
      <Td width="12ch">{props.metrics?.pendingAddEntriesCount === undefined ? <NoData /> : i18n.formatCount(props.metrics.pendingAddEntriesCount)}</Td>
      <Td width="12ch">{props.metrics?.backlogSize === undefined ? <NoData /> : i18n.formatBytes(props.metrics.backlogSize)}</Td>
      <Td width="12ch">{props.metrics?.storageSize === undefined ? <NoData /> : i18n.formatBytes(props.metrics.storageSize)}</Td>
    </>
  );
}

const sortTenants = (tenants: string[], sort: Sort, data: {
  tenantsNamespacesCount: Record<string, number>,
  allTenantsMetrics: Record<string, TenantMetrics>
}): string[] => {
  function s(defs: string[], undefs: string[], getM: (m: TenantMetrics) => number): string[] {
    let result = defs.sort((a, b) => {
      const aMetrics = data.allTenantsMetrics[a];
      const bMetrics = data.allTenantsMetrics[b];
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
    const [defs, undefs] = partition(tenants, (t) => data.allTenantsMetrics[t]?.averageMsgSize !== undefined);
    return s(defs, undefs, (m) => m.averageMsgSize!);
  }

  if (sort.key === 'backlogSize') {
    const [defs, undefs] = partition(tenants, (t) => data.allTenantsMetrics[t]?.backlogSize !== undefined);
    return s(defs, undefs, (m) => m.backlogSize!);
  }

  if (sort.key === 'bytesInCount') {
    const [defs, undefs] = partition(tenants, (t) => data.allTenantsMetrics[t]?.bytesInCount !== undefined);
    return s(defs, undefs, (m) => m.bytesInCount!);
  }

  if (sort.key === 'bytesOutCount') {
    const [defs, undefs] = partition(tenants, (t) => data.allTenantsMetrics[t]?.bytesOutCount !== undefined);
    return s(defs, undefs, (m) => m.bytesOutCount!);
  }

  if (sort.key === 'msgInCount') {
    const [defs, undefs] = partition(tenants, (t) => data.allTenantsMetrics[t]?.msgInCount !== undefined);
    return s(defs, undefs, (m) => m.msgInCount!);
  }

  if (sort.key === 'msgOutCount') {
    const [defs, undefs] = partition(tenants, (t) => data.allTenantsMetrics[t]?.msgOutCount !== undefined);
    return s(defs, undefs, (m) => m.msgOutCount!);
  }

  if (sort.key === 'msgRateIn') {
    const [defs, undefs] = partition(tenants, (t) => data.allTenantsMetrics[t]?.msgRateIn !== undefined);
    return s(defs, undefs, (m) => m.msgRateIn!);
  }

  if (sort.key === 'msgRateOut') {
    const [defs, undefs] = partition(tenants, (t) => data.allTenantsMetrics[t]?.msgRateOut !== undefined);
    return s(defs, undefs, (m) => m.msgRateOut!);
  }

  if (sort.key === 'msgThroughputIn') {
    const [defs, undefs] = partition(tenants, (t) => data.allTenantsMetrics[t]?.msgThroughputIn !== undefined);
    return s(defs, undefs, (m) => m.msgThroughputIn!);
  }

  if (sort.key === 'msgThroughputOut') {
    const [defs, undefs] = partition(tenants, (t) => data.allTenantsMetrics[t]?.msgThroughputOut !== undefined);
    return s(defs, undefs, (m) => m.msgThroughputOut!);
  }

  if (sort.key === 'pendingAddEntriesCount') {
    const [defs, undefs] = partition(tenants, (t) => data.allTenantsMetrics[t]?.pendingAddEntriesCount !== undefined);
    return s(defs, undefs, (m) => m.pendingAddEntriesCount!);
  }

  if (sort.key === 'storageSize') {
    const [defs, undefs] = partition(tenants, (t) => data.allTenantsMetrics[t]?.storageSize !== undefined);
    return s(defs, undefs, (m) => m.storageSize!);
  }

  return tenants;
}

const NoData = () => {
  return <div className={cts.NoData}>-</div>
}

function sum(metrics: Record<string, TenantMetrics>, key: keyof TenantMetrics): number {
  return Object.values(metrics).reduce((summaryValue, tnMetric) => summaryValue + (tnMetric[key] || 0), 0);
}

export default Tenants;

export type TenantMetrics = {
  producerCount?: number;
  averageMsgSize?: number;
  msgRateIn?: number;
  msgRateOut?: number;
  msgInCount?: number;
  bytesInCount?: number;
  msgOutCount?: number;
  bytesOutCount?: number;
  msgThroughputIn?: number;
  msgThroughputOut?: number;
  storageSize?: number;
  backlogSize?: number;
  pendingAddEntriesCount?: number;
};
