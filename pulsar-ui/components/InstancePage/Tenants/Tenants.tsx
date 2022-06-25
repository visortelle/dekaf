import React, { useCallback, useEffect, useMemo, useState } from 'react';
import s from './Tenants.module.css'
import * as PulsarAdminClient from '../../app/contexts/PulsarAdminClient';
import * as PulsarAdminBatchClient from '../../app/contexts/PulsarAdminBatchClient/PulsarAdminBatchClient';
import * as PulsarCustomApiClient from '../../app/contexts/PulsarCustomApiClient/PulsarCustomApiClient';
import * as Notifications from '../../app/contexts/Notifications';
import * as I18n from '../../app/contexts/I18n/I18n';
import useSWR from 'swr';
import { swrKeys } from '../../swrKeys';
import { ListItem, TableVirtuoso } from 'react-virtuoso';
import { TenantMetrics } from 'tealtools-pulsar-ui-api/metrics/types';
import { isEqual } from 'lodash';
import Highlighter from "react-highlight-words";
import LinkWithQuery from '../../ui/LinkWithQuery/LinkWithQuery';
import { routes } from '../../routes';
import { NamespaceIcon } from '../../ui/Icons/Icons';
import Input from '../../ui/Input/Input';
import { useDebounce } from 'use-debounce';
import { TenantInfo } from '../../app/contexts/PulsarAdminBatchClient/get-xs';
import { useRef } from 'react';
import SvgIcon from '../../ui/SvgIcon/SvgIcon';
import arrowDownIcon from '!!raw-loader!./arrow-down.svg';
import arrowUpIcon from '!!raw-loader!./arrow-up.svg';

type SortKey =
  'tenant' |
  'namespaces' |
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

const Tenants: React.FC = () => {
  const tableRef = useRef<HTMLDivElement>(null);
  const adminClient = PulsarAdminClient.useContext().client;
  const adminBatchClient = PulsarAdminBatchClient.useContext().client;
  const customApiClient = PulsarCustomApiClient.useContext().client;
  const { notifyError } = Notifications.useContext();
  const [filterQuery, setFilterQuery] = useState('');
  const [filterQueryDebounced] = useDebounce(filterQuery, 400);
  const [itemsRendered, setItemsRendered] = useState<ListItem<string>[]>([]);
  const [itemsRenderedDebounced] = useDebounce(itemsRendered, 400);
  const [tenantsNamespacesCountCache, setTenantsNamespacesCountCache] = useState<Record<string, number>>({});
  const [tenantsInfoCache, setTenantsInfoCache] = useState<Record<string, TenantInfo>>({});
  const [sort, setSort] = useState<Sort>({ key: 'tenant', direction: 'asc' });

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
      <th className={s.Th} style={style} onClick={handleColumnHeaderClick}>
        <div className={props.sortKey === undefined ? '' : s.SortableTh}>
          {props.title}

          {sort.key === props.sortKey && (
            <div className={s.SortableThIcon}>
              <SvgIcon svg={sort.direction === 'asc' ? arrowDownIcon : arrowUpIcon} />
            </div>
          )}
        </div>
      </th>
    );
  }, [sort.direction, sort.key])

  const { data: tenants, error: tenantsError } = useSWR(
    swrKeys.pulsar.tenants._(),
    async () => await adminClient.tenants.getTenants()
  );
  if (tenantsError) {
    notifyError(`Unable to get tenants list. ${tenantsError}`);
  }

  const { data: allTenantsMetrics, error: allTenantsMetricsError } = useSWR(
    swrKeys.pulsar.customApi.metrics.allTenants._(),
    async () => await customApiClient.getAllTenantsMetrics(),
  );
  if (allTenantsMetricsError) {
    notifyError(`Unable to get metrics. ${allTenantsMetricsError}`);
  }

  const { data: tenantsNamespacesCount, error: tenantsNamespacesCountError } = useSWR(
    itemsRenderedDebounced.length === 0 ? null : swrKeys.pulsar.batch.getTenantsNamespacesCount._(itemsRenderedDebounced.map(item => item.data!)),
    async () => await adminBatchClient?.getTenantsNamespacesCount(itemsRenderedDebounced.map(item => item?.data || '')),
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
    async () => await adminBatchClient?.getTenantsInfo(itemsRenderedDebounced.map(item => item?.data || '')),
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

  return (
    <div className={s.Tenants}>
      <div className={s.Toolbar}>
        <div className={s.FilterInput}>
          <Input value={filterQuery} onChange={(v) => setFilterQuery(v)} placeholder="tenant-name" focusOnMount={true} clearable={true} />
        </div>
        <div>
          <strong>{tenantsToShow.length}</strong> <span style={{ fontWeight: 'normal' }}>of</span> <strong>{tenants?.length}</strong> tenants found.
        </div>
      </div>

      {(tenantsToShow || []).length === 0 && (
        <div className={s.NothingToShow}>
          Nothing to show.
        </div>
      )}
      {(tenantsToShow || []).length > 0 && (
        <div className={s.Table} ref={tableRef}>
          <TableVirtuoso
            className={s.TableVirtuoso}
            data={tenantsToShow}
            overscan={{ main: (tableRef?.current?.clientHeight || 0), reverse: (tableRef?.current?.clientHeight || 0) }}
            fixedHeaderContent={() => (
              <tr>
                <Th title={(
                  <div>
                    <span>Tenants</span>
                  </div>
                )} sortKey="tenant" isSticky={true} />
                <Th title={<NamespaceIcon />} sortKey="namespaces" />
                <Th title="Allowed clusters" />
                <Th title="Admin roles" />
                <Th title="Avg. msg. size" sortKey="averageMsgSize" />
                <Th title="Backlog size" sortKey="backlogSize" />
                <Th title="Bytes in" sortKey="bytesInCount" />
                <Th title="Bytes out" sortKey="bytesOutCount" />
                <Th title="Msg. in" sortKey="msgInCount" />
                <Th title="Msg. out" sortKey="msgOutCount" />
                <Th title="Msg. rate in" sortKey="msgRateIn" />
                <Th title="Msg. rate out" sortKey="msgRateOut" />
                <Th title="Msg. throughput in" sortKey="msgThroughputIn" />
                <Th title="Msg. throughput out" sortKey="msgThroughputOut" />
                <Th title="Pending entries" sortKey="pendingAddEntriesCount" />
                <Th title="Producers" sortKey="producerCount" />
                <Th title="Storage size" sortKey="storageSize" />
              </tr>
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
    return <td className={s.Td} {...restProps}>
      <div style={{ width: props.width, overflow: 'hidden', textOverflow: 'ellipsis' }} >
        {children}
      </div>
    </td>;
  }, []);

  return (
    <>
      <Td width={firstColumnWidth} title={props.tenant} style={{ position: 'sticky', left: 0 }}>
        <LinkWithQuery to={routes.tenants.tenant._.get({ tenant: props.tenant })}>
          <Highlighter
            highlightClassName="highlight-substring"
            searchWords={props.highlight.tenant}
            autoEscape={true}
            textToHighlight={props.tenant}
          />
        </LinkWithQuery>
      </Td>
      <Td width="4ch" title={`${props.namespacesCount?.toString()} namespaces`}>
        {props.namespacesCount !== undefined && <span className={s.LazyContent}>{props.namespacesCount}</span>}
      </Td>
      <Td width="12ch">
        {props.tenantInfo !== undefined && (
          <div className={s.LazyContent}>
            {props.tenantInfo.allowedClusters.length === 0 ?
              <NoData /> :
              props.tenantInfo.allowedClusters.sort((a, b) => a.localeCompare(b, 'en', { numeric: true })).map((c) => <div key={c} className={s.Badge} title={c}>{c}</div>)
            }
          </div>
        )}
      </Td>
      <Td width="12ch">
        {props.tenantInfo !== undefined && (
          <div className={s.LazyContent}>
            {props.tenantInfo.adminRoles.length === 0 ?
              <NoData /> :
              props.tenantInfo?.adminRoles.sort((a, b) => a.localeCompare(b, 'en', { numeric: true })).map((r) => <div key={r} className={s.Badge} title={r}>{r}</div>)
            }
          </div>
        )}
      </Td>
      <Td width="6ch">{props.metrics?.averageMsgSize === undefined ? <NoData /> : i18n.formatBytes(props.metrics.averageMsgSize)}</Td>
      <Td width="6ch">{props.metrics?.backlogSize === undefined ? <NoData /> : i18n.formatCount(props.metrics.backlogSize)}</Td>
      <Td width="6ch">{props.metrics?.bytesInCount === undefined ? <NoData /> : i18n.formatCount(props.metrics.bytesInCount)}</Td>
      <Td width="6ch">{props.metrics?.bytesOutCount === undefined ? <NoData /> : i18n.formatCount(props.metrics.bytesOutCount)}</Td>
      <Td width="6ch">{props.metrics?.msgInCount === undefined ? <NoData /> : i18n.formatCount(props.metrics.msgInCount)}</Td>
      <Td width="6ch">{props.metrics?.msgOutCount === undefined ? <NoData /> : i18n.formatCount(props.metrics.msgOutCount)}</Td>
      <Td width="6ch">{props.metrics?.msgRateIn === undefined ? <NoData /> : i18n.formatRate(props.metrics.msgRateIn)}</Td>
      <Td width="6ch">{props.metrics?.msgRateOut === undefined ? <NoData /> : i18n.formatRate(props.metrics.msgRateOut)}</Td>
      <Td width="6ch">{props.metrics?.msgThroughputIn === undefined ? <NoData /> : i18n.formatRate(props.metrics.msgThroughputIn)}</Td>
      <Td width="6ch">{props.metrics?.msgThroughputOut === undefined ? <NoData /> : i18n.formatRate(props.metrics.msgThroughputOut)}</Td>
      <Td width="6ch">{props.metrics?.pendingAddEntriesCount === undefined ? <NoData /> : i18n.formatCount(props.metrics.pendingAddEntriesCount)}</Td>
      <Td width="6ch">{props.metrics?.producerCount === undefined ? <NoData /> : i18n.formatCount(props.metrics.producerCount)}</Td>
      <Td width="6ch">{props.metrics?.storageSize === undefined ? <NoData /> : i18n.formatBytes(props.metrics.storageSize)}</Td>
    </>
  );
}

const sortTenants = (tenants: string[], sort: Sort, data: {
  tenantsNamespacesCount: Record<string, number>,
  allTenantsMetrics: Record<string, TenantMetrics>
}): string[] => {
  if (sort.key === 'tenant') {
    const t = tenants.sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
    return sort.direction === 'asc' ? t : t.reverse();
  }

  if (sort.key === 'namespaces') {
    return tenants.sort((a, b) => {
      const aCount = data.tenantsNamespacesCount[a];
      const bCount = data.tenantsNamespacesCount[b];
      return sort.direction === 'asc' ? aCount - bCount : bCount - aCount;
    });
  }

  if (sort.key === 'averageMsgSize') {
    return tenants.sort((a, b) => {
      const aMetrics = data.allTenantsMetrics[a];
      const bMetrics = data.allTenantsMetrics[b];
      const aSize = aMetrics?.averageMsgSize;
      const bSize = bMetrics?.averageMsgSize;
      return sort.direction === 'asc' ? aSize! - bSize! : bSize! - aSize!;
    });
  }
  if (sort.key === 'backlogSize') {
    return tenants.sort((a, b) => {
      const aMetrics = data.allTenantsMetrics[a];
      const bMetrics = data.allTenantsMetrics[b];
      const aSize = aMetrics?.backlogSize;
      const bSize = bMetrics?.backlogSize;
      return sort.direction === 'asc' ? aSize! - bSize! : bSize! - aSize!;
    });
  }
  if (sort.key === 'bytesInCount') {
    return tenants.sort((a, b) => {
      const aMetrics = data.allTenantsMetrics[a];
      const bMetrics = data.allTenantsMetrics[b];
      const aSize = aMetrics?.bytesInCount;
      const bSize = bMetrics?.bytesInCount;
      return sort.direction === 'asc' ? aSize! - bSize! : bSize! - aSize!;
    });
  }

  return tenants;
}

const NoData = () => {
  return <div className={s.NoData}>-</div>
}

export default Tenants;
