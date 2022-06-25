import React, { useCallback, useEffect, useState } from 'react';
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

type SortKeys =
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
  const [sort, setSort] = useState<{ key: SortKeys, direction: 'asc' | 'desc' }>({ key: 'tenant', direction: 'asc' });

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

  const filteredTenants = tenants?.sort((a, b) => a.localeCompare(b, 'en', { numeric: true })).filter((t) => t.includes(filterQueryDebounced));

  return (
    <div className={s.Tenants}>
      <div className={s.Toolbar}>
        <div className={s.FilterInput}>
          <Input value={filterQuery} onChange={(v) => setFilterQuery(v)} placeholder="tenant-name" focusOnMount={true} clearable={true} />
        </div>
      </div>

      {(filteredTenants || []).length === 0 && (
        <div className={s.NothingToShow}>
          Nothing to show.
        </div>
      )}
      {(filteredTenants || []).length > 0 && (
        <div className={s.Table} ref={tableRef}>
          <TableVirtuoso
            className={s.TableVirtuoso}
            data={filteredTenants}
            overscan={{ main: (tableRef?.current?.clientHeight || 0), reverse: (tableRef?.current?.clientHeight || 0)}}
            fixedHeaderContent={() => (
              <tr>
                <th className={s.Th} style={{ position: 'sticky', left: 0, zIndex: 10 }}>Tenant</th>
                <th className={s.Th}><NamespaceIcon /></th>
                <th className={s.Th}>Allowed clusters</th>
                <th className={s.Th}>Admin roles</th>
                <th className={s.Th}>Avg. message size</th>
                <th className={s.Th}>Avg. backlog size</th>
                <th className={s.Th}>Bytes in</th>
                <th className={s.Th}>Bytes out</th>
                <th className={s.Th}>Msg. in</th>
                <th className={s.Th}>Msg. out</th>
                <th className={s.Th}>Msg. rate in</th>
                <th className={s.Th}>Msg. rate out</th>
                <th className={s.Th}>Msg. throughput in</th>
                <th className={s.Th}>Msg. throughput out</th>
                <th className={s.Th}>Pending entries</th>
                <th className={s.Th}>Producers</th>
                <th className={s.Th}>Storage size</th>
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
            totalCount={filteredTenants?.length}
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
      <Td width="15ch" title={props.tenant} style={{ position: 'sticky', left: 0 }}>
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

const NoData = () => {
  return <div className={s.NoData}>-</div>
}

export default Tenants;
