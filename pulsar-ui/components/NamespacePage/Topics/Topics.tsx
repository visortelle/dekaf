import React, { useCallback, useMemo, useState } from 'react';
import s from './Topics.module.css'
import cts from "../../ui/ChildrenTable/ChildrenTable.module.css";
import arrowDownIcon from '!!raw-loader!../../ui/ChildrenTable/arrow-down.svg';
import arrowUpIcon from '!!raw-loader!../../ui/ChildrenTable/arrow-up.svg';
import SvgIcon from '../../ui/SvgIcon/SvgIcon';
import * as PulsarCustomApiClient from '../../app/contexts/PulsarCustomApiClient/PulsarCustomApiClient';
import * as Notifications from '../../app/contexts/Notifications';
import * as I18n from '../../app/contexts/I18n/I18n';
import useSWR from 'swr';
import { swrKeys } from '../../swrKeys';
import { ListItem, TableVirtuoso } from 'react-virtuoso';
import { TopicMetrics } from 'tealtools-pulsar-ui-api/metrics/types';
import { isEqual, partition } from 'lodash';
import Highlighter from "react-highlight-words";
import LinkWithQuery from '../../ui/LinkWithQuery/LinkWithQuery';
import { routes } from '../../routes';
import { TopicIcon, SubscriptionIcon, ProducerIcon } from '../../ui/Icons/Icons';
import Input from '../../ui/Input/Input';
import { useDebounce } from 'use-debounce';
import { useRef } from 'react';
import _ from 'lodash';

type SortKey =
  'topic' |
  'topicType' |
  'producersCount' |
  'subscriptionsCount' |
  'replication' |
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

type Topic = { topicType: 'persistent' | 'non-persistent', topic: string, metrics: TopicMetrics };

type TopicsProps = {
  tenant: string;
  namespace: string;
}

const Topics: React.FC<TopicsProps> = (props) => {
  const tableRef = useRef<HTMLDivElement>(null);
  const customApiClient = PulsarCustomApiClient.useContext().client;
  const { notifyError } = Notifications.useContext();
  const [filterQuery, setFilterQuery] = useState('');
  const [filterQueryDebounced] = useDebounce(filterQuery, 400);
  const [itemsRendered, setItemsRendered] = useState<ListItem<Topic>[]>([]);
  const [sort, setSort] = useState<Sort>({ key: 'topic', direction: 'asc' });
  const i18n = I18n.useContext();

  const Th = useCallback((props: { title: React.ReactNode, sortKey?: SortKey, style?: React.CSSProperties }) => {
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

    return (
      <th className={cts.Th} style={props.style} onClick={handleColumnHeaderClick}>
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

  const { data: allTopicsMetricsData, error: allTopicsMetricsDataError } = useSWR(
    swrKeys.pulsar.customApi.metrics.allNamespaceTopics._(props.tenant, props.namespace),
    async () => await customApiClient.getAllNamespaceTopicsMetrics(props.tenant, props.namespace),
    { refreshInterval: 3 * 1000 }
  );
  if (allTopicsMetricsDataError) {
    notifyError(`Unable to get all topics metrics. ${allTopicsMetricsDataError}`);
  }

  const allTopicsMetrics = allTopicsMetricsData || { persistent: {}, nonPersistent: {} };

  const persistentTopicsMetrics: Topic[] = _(allTopicsMetrics.persistent).toPairs().map<Topic>(([topic, v]) => ({ topicType: 'persistent', topic, metrics: v })).value();
  const nonPersistentTopicsMetrics: Topic[] = _(allTopicsMetrics.nonPersistent).toPairs().map<Topic>(([topic, v]) => ({ topicType: 'non-persistent', topic, metrics: v })).value();
  const topics: Topic[] = persistentTopicsMetrics.concat(nonPersistentTopicsMetrics);


  const sortedTopics = useMemo(() => sortTopics(topics, sort), [topics, sort]);

  const topicsToShow = sortedTopics?.filter((t) => t.topic.includes(filterQueryDebounced));

  return (
    <div className={s.Namespaces}>
      <div className={s.Toolbar}>
        <div className={s.FilterInput}>
          <Input value={filterQuery} onChange={(v) => setFilterQuery(v)} placeholder="topic-name" focusOnMount={true} clearable={true} />
        </div>
        <div>
          <strong>{topicsToShow.length}</strong> <span style={{ fontWeight: 'normal' }}>of</span> <strong>{topicsToShow.length}</strong> namespaces.
        </div>
      </div>

      {(topicsToShow || []).length === 0 && (
        <div className={cts.NothingToShow}>
          Nothing to show.
        </div>
      )}
      {(topicsToShow || []).length > 0 && (
        <div className={cts.Table} ref={tableRef}>
          <TableVirtuoso
            data={topicsToShow}
            overscan={{ main: (tableRef?.current?.clientHeight || 0), reverse: (tableRef?.current?.clientHeight || 0) }}
            fixedHeaderContent={() => (
              <>
                <tr>
                  <Th title="Namespaces" sortKey="topic" style={{ position: 'sticky', left: 0, zIndex: 10 }} />
                  <Th title="-" sortKey="topicType" style={{ position: 'sticky', left: `calc(${firstColumnWidth} + 34rem)`, zIndex: 10 }} />
                  <Th title={<ProducerIcon />} sortKey="producerCount" />
                  <Th title={<SubscriptionIcon />} sortKey="subscriptionsCount" />
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
                  <th className={cts.SummaryTh} style={{ position: 'sticky', left: `calc(${firstColumnWidth} + 34rem)`, zIndex: 10 }}><NoData /></th>
                  <th className={cts.SummaryTh}><NoData /></th>
                  <th className={cts.SummaryTh}><NoData /></th>
                  <th className={cts.SummaryTh}>{i18n.formatCountRate(sum(topics, 'msgRateIn'))}</th>
                  <th className={cts.SummaryTh}>{i18n.formatCountRate(sum(topics, 'msgRateOut'))}</th>
                  <th className={cts.SummaryTh}>{i18n.formatCountRate(sum(topics, 'msgThroughputIn'))}</th>
                  <th className={cts.SummaryTh}>{i18n.formatCountRate(sum(topics, 'msgThroughputOut'))}</th>
                  <th className={cts.SummaryTh}>{i18n.formatCount(sum(topics, 'msgInCount'))}</th>
                  <th className={cts.SummaryTh}>{i18n.formatCount(sum(topics, 'msgOutCount'))}</th>
                  <th className={cts.SummaryTh}>{i18n.formatBytes(Object.keys(topics).length > 0 ? sum(topics, 'averageMsgSize') / topics.length : 0)}</th>
                  <th className={cts.SummaryTh}>{i18n.formatBytes(sum(topics, 'bytesInCount'))}</th>
                  <th className={cts.SummaryTh}>{i18n.formatBytes(sum(topics, 'bytesOutCount'))}</th>
                  <th className={cts.SummaryTh}>{i18n.formatCount(sum(topics, 'pendingAddEntriesCount'))}</th>
                  <th className={cts.SummaryTh}>{i18n.formatBytes(sum(topics, 'backlogSize'))}</th>
                  <th className={cts.SummaryTh}>{i18n.formatBytes(sum(topics, 'storageSize'))}</th>
                </tr>
              </>
            )}
            itemContent={(_, topic) => {
              return (
                <TopicComponent
                  tenant={props.tenant}
                  namespace={props.namespace}
                  topic={topic}
                  highlight={{ topic: [filterQueryDebounced] }}
                />
              );
            }}
            customScrollParent={tableRef.current || undefined}
            totalCount={topicsToShow?.length}
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
    <div style={{ width: props.width, textOverflow: 'ellipsis', display: 'flex' }} >
      {children}
    </div>
  </td>;
};

type TopicComponentProps = {
  tenant: string;
  namespace: string;
  topic: Topic;
  highlight: {
    topic: string[];
  }
}
const TopicComponent: React.FC<TopicComponentProps> = (props) => {
  const i18n = I18n.useContext();

  const subscriptionsCount = props.topic.metrics.subscriptions === undefined ? undefined : Object.keys(props.topic.metrics.subscriptions).length;

  return (
    <>
      <Td width={firstColumnWidth} title={props.topic.topic} style={{ position: 'sticky', left: 0, zIndex: 1 }}>
        <LinkWithQuery
          to={routes.tenants.tenant.namespaces.namespace.topics._.get({ tenant: props.tenant, namespace: props.namespace })}
          className="A"
          style={{ position: 'relative' }}
        >
          <Highlighter
            highlightClassName="highlight-substring"
            searchWords={props.highlight.topic}
            autoEscape={true}
            textToHighlight={props.topic.topic}
          />
        </LinkWithQuery>
      </Td>
      <Td width="20rem" style={{ position: 'sticky', left: `calc(${firstColumnWidth} + 25rem)`, zIndex: 1 }}>
        <div style={{ transform: 'scale(0.8) translate(-20%, 0)' }}>
          <TopicIcon topicType={props.topic.topicType} />
        </div>
      </Td>
      <Td width="4ch" title={`${props.topic.metrics.publishers?.length?.toString()} publishers`}>
        {props.topic.metrics.publishers !== undefined && <span className={cts.LazyContent}>{props.topic.metrics.publishers.length}</span>}
      </Td>
      <Td width="4ch" title={`${subscriptionsCount === undefined ? '-' : subscriptionsCount.toString()} subscriptions`}>
        {subscriptionsCount !== undefined && <span className={cts.LazyContent}>{subscriptionsCount}</span>}
      </Td>
      <Td width="12ch">{props.topic.metrics?.msgRateIn === undefined ? <NoData /> : i18n.formatCountRate(props.topic.metrics.msgRateIn)}</Td>
      <Td width="12ch">{props.topic.metrics?.msgRateOut === undefined ? <NoData /> : i18n.formatCountRate(props.topic.metrics.msgRateOut)}</Td>
      <Td width="18ch">{props.topic.metrics?.msgThroughputIn === undefined ? <NoData /> : i18n.formatCountRate(props.topic.metrics.msgThroughputIn)}</Td>
      <Td width="18ch">{props.topic.metrics?.msgThroughputOut === undefined ? <NoData /> : i18n.formatCountRate(props.topic.metrics.msgThroughputOut)}</Td>
      <Td width="12ch">{props.topic.metrics?.msgInCount === undefined ? <NoData /> : i18n.formatCount(props.topic.metrics.msgInCount)}</Td>
      <Td width="12ch">{props.topic.metrics?.msgOutCount === undefined ? <NoData /> : i18n.formatCount(props.topic.metrics.msgOutCount)}</Td>
      <Td width="12ch">{props.topic.metrics?.averageMsgSize === undefined ? <NoData /> : i18n.formatBytes(props.topic.metrics.averageMsgSize)}</Td>
      <Td width="12ch">{props.topic.metrics?.bytesInCount === undefined ? <NoData /> : i18n.formatBytes(props.topic.metrics.bytesInCount)}</Td>
      <Td width="12ch">{props.topic.metrics?.bytesOutCount === undefined ? <NoData /> : i18n.formatBytes(props.topic.metrics.bytesOutCount)}</Td>
      <Td width="12ch">{props.topic.metrics?.pendingAddEntriesCount === undefined ? <NoData /> : i18n.formatCount(props.topic.metrics.pendingAddEntriesCount)}</Td>
      <Td width="12ch">{props.topic.metrics?.backlogSize === undefined ? <NoData /> : i18n.formatCount(props.topic.metrics.backlogSize)}</Td>
      <Td width="12ch">{props.topic.metrics?.storageSize === undefined ? <NoData /> : i18n.formatBytes(props.topic.metrics.storageSize)}</Td>
    </>
  );
}

const sortTopics = (topics: Topic[], sort: Sort): Topic[] => {
  function s(defs: Topic[], undefs: Topic[], getM: (m: TopicMetrics) => number): Topic[] {
    let result = defs.sort((a, b) => {
      return getM(a.metrics) - getM(b.metrics);
    });
    result = sort.direction === 'asc' ? result : result.reverse();
    return result.concat(undefs);
  }

  if (sort.key === 'topic') {
    const t = topics.sort((a, b) => a.topic.localeCompare(b.topic, 'en', { numeric: true }));
    return sort.direction === 'asc' ? t : t.reverse();
  }

  if (sort.key === 'topicType') {
    const t = topics.sort((a, b) => {
      if (a.topicType === b.topicType) {
        return a.topic.localeCompare(b.topic, 'en', { numeric: true });
      }
      return a.topicType.localeCompare(b.topicType, 'en', { numeric: true })
    });
    return sort.direction === 'asc' ? t : t.reverse();
  }

  if (sort.key === 'producersCount') {
    const [defs, undefs] = partition(topics, (t) => t.metrics.publishers?.length !== undefined);
    return s(defs, undefs, (m) => m.publishers?.length!);
  }

  if (sort.key === 'subscriptionsCount') {
    const [defs, undefs] = partition(topics, (t) => Object.keys(t.metrics.subscriptions || {}).length !== undefined);
    return s(defs, undefs, (m) => Object.keys(m.subscriptions || {}).length!);
  }

  if (sort.key === 'averageMsgSize') {
    const [defs, undefs] = partition(topics, (t) => t.metrics.averageMsgSize !== undefined);
    return s(defs, undefs, (m) => m.averageMsgSize!);
  }

  if (sort.key === 'backlogSize') {
    const [defs, undefs] = partition(topics, (t) => t.metrics?.backlogSize !== undefined);
    return s(defs, undefs, (m) => m.backlogSize!);
  }

  if (sort.key === 'bytesInCount') {
    const [defs, undefs] = partition(topics, (t) => t.metrics?.bytesInCount !== undefined);
    return s(defs, undefs, (m) => m.bytesInCount!);
  }

  if (sort.key === 'bytesOutCount') {
    const [defs, undefs] = partition(topics, (t) => t.metrics?.bytesOutCount !== undefined);
    return s(defs, undefs, (m) => m.bytesOutCount!);
  }

  if (sort.key === 'msgInCount') {
    const [defs, undefs] = partition(topics, (t) => t.metrics?.msgInCount !== undefined);
    return s(defs, undefs, (m) => m.msgInCount!);
  }

  if (sort.key === 'msgOutCount') {
    const [defs, undefs] = partition(topics, (t) => t.metrics?.msgOutCount !== undefined);
    return s(defs, undefs, (m) => m.msgOutCount!);
  }

  if (sort.key === 'msgRateIn') {
    const [defs, undefs] = partition(topics, (t) => t.metrics?.msgRateIn !== undefined);
    return s(defs, undefs, (m) => m.msgRateIn!);
  }

  if (sort.key === 'msgRateOut') {
    const [defs, undefs] = partition(topics, (t) => t.metrics?.msgRateOut !== undefined);
    return s(defs, undefs, (m) => m.msgRateOut!);
  }

  if (sort.key === 'msgThroughputIn') {
    const [defs, undefs] = partition(topics, (t) => t.metrics?.msgThroughputIn !== undefined);
    return s(defs, undefs, (m) => m.msgThroughputIn!);
  }

  if (sort.key === 'msgThroughputOut') {
    const [defs, undefs] = partition(topics, (t) => t.metrics?.msgThroughputOut !== undefined);
    return s(defs, undefs, (m) => m.msgThroughputOut!);
  }

  if (sort.key === 'pendingAddEntriesCount') {
    const [defs, undefs] = partition(topics, (t) => t.metrics?.pendingAddEntriesCount !== undefined);
    return s(defs, undefs, (m) => m.pendingAddEntriesCount!);
  }

  if (sort.key === 'producerCount') {
    const [defs, undefs] = partition(topics, (t) => t.metrics?.producerCount !== undefined);
    return s(defs, undefs, (m) => m.producerCount!);
  }

  if (sort.key === 'storageSize') {
    const [defs, undefs] = partition(topics, (t) => t.metrics?.storageSize !== undefined);
    return s(defs, undefs, (m) => m.storageSize!);
  }

  return topics;
}

const NoData = () => {
  return <div className={cts.NoData}>-</div>
}

function sum(topics: Topic[], key: keyof TopicMetrics): number {
  return topics.reduce((acc, v) => {
    if (typeof v !== 'number') {
      return acc;
    }
    return acc + (v || 0);
  }, 0);
}

export default Topics;
