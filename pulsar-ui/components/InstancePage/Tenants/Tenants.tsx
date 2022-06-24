import React, { useEffect, useState } from 'react';
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
  const adminClient = PulsarAdminClient.useContext().client;
  const adminBatchClient = PulsarAdminBatchClient.useContext().client;
  const customApiClient = PulsarCustomApiClient.useContext().client;
  const { notifyError } = Notifications.useContext();
  const [filterQuery, setFilterQuery] = useState('');
  const [filterQueryDebounced] = useDebounce(filterQuery, 400);
  const [itemsRendered, setItemsRendered] = useState<ListItem<string>[]>([]);
  const [itemsRenderedDebounced] = useDebounce(itemsRendered, 400);
  const [tenantsNamespacesCountCache, setTenantsNamespacesCountCache] = useState<{ [key: string]: number }>({});
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
    async () => await customApiClient.getAllTenantsMetrics()
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

  const filteredTenants = tenants?.sort((a, b) => a.localeCompare(b, 'en', { numeric: true })).filter((t) => t.includes(filterQueryDebounced));

  return (
    <div className={s.Tenants}>
      <div className={s.Toolbar}>
        <div className={s.FilterInput}>
          <Input value={filterQuery} onChange={(v) => setFilterQuery(v)} placeholder="tenant-name" focusOnMount={true} />
        </div>
      </div>

      {(filteredTenants || []).length === 0 && (
        <div className={s.NothingToShow}>
          Nothing to show.
        </div>
      )}
      {(filteredTenants || []).length > 0 && (
        <div className={s.Table}>
          <TableVirtuoso
            data={filteredTenants}
            overscan={{ main: window.innerHeight / 2, reverse: window.innerHeight / 2 }}
            fixedHeaderContent={() => (
              <tr>
                <th className={s.Th}>Tenant</th>
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
                  highlight={{ tenant: [filterQueryDebounced] }}
                />
              );
            }}
            useWindowScroll={true}
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
  highlight: {
    tenant: string[];
  }
}
const Tenant: React.FC<TenantProps> = (props) => {
  const i18n = I18n.useContext();

  return (
    <>
      <td className={s.Td} style={{ whiteSpace: 'nowrap' }}>
        <LinkWithQuery to={routes.tenants.tenant._.get({ tenant: props.tenant })}>
          <Highlighter
            highlightClassName="highlight-substring"
            searchWords={props.highlight.tenant}
            autoEscape={true}
            textToHighlight={props.tenant}
          />
        </LinkWithQuery>
      </td>
      <td className={s.Td}>
        <LinkWithQuery to={routes.tenants.tenant._.get({ tenant: props.tenant })}>
          {props.namespacesCount !== undefined && <span className={s.NamespacesCount}>{props.namespacesCount}</span>}
        </LinkWithQuery>
      </td>
      <td className={s.Td}></td>
      <td className={s.Td}></td>
      <td className={s.Td}>{props.metrics?.averageMsgSize === undefined ? '' : i18n.formatBytes(props.metrics.averageMsgSize)}</td>
      <td className={s.Td}>{props.metrics?.backlogSize === undefined ? '' : i18n.formatCount(props.metrics.backlogSize)}</td>
      <td className={s.Td}>{props.metrics?.bytesInCount === undefined ? '' : i18n.formatCount(props.metrics.bytesInCount)}</td>
      <td className={s.Td}>{props.metrics?.bytesOutCount === undefined ? '' : i18n.formatCount(props.metrics.bytesOutCount)}</td>
      <td className={s.Td}>{props.metrics?.msgInCount === undefined ? '' : i18n.formatCount(props.metrics.msgInCount)}</td>
      <td className={s.Td}>{props.metrics?.msgOutCount === undefined ? '' : i18n.formatCount(props.metrics.msgOutCount)}</td>
      <td className={s.Td}>{props.metrics?.msgRateIn === undefined ? '' : i18n.formatRate(props.metrics.msgRateIn)}</td>
      <td className={s.Td}>{props.metrics?.msgRateOut === undefined ? '' : i18n.formatRate(props.metrics.msgRateOut)}</td>
      <td className={s.Td}>{props.metrics?.msgThroughputIn === undefined ? '' : i18n.formatRate(props.metrics.msgThroughputIn)}</td>
      <td className={s.Td}>{props.metrics?.msgThroughputOut === undefined ? '' : i18n.formatRate(props.metrics.msgThroughputOut)}</td>
      <td className={s.Td}>{props.metrics?.pendingAddEntriesCount === undefined ? '' : i18n.formatCount(props.metrics.pendingAddEntriesCount)}</td>
      <td className={s.Td}>{props.metrics?.producerCount === undefined ? '' : i18n.formatCount(props.metrics.producerCount)}</td>
      <td className={s.Td}>{props.metrics?.storageSize === undefined ? '' : i18n.formatBytes(props.metrics.storageSize)}</td>
    </>
  );
}

export default Tenants;
