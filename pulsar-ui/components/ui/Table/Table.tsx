import React, { useRef, useState } from 'react';
import { TableVirtuoso } from 'react-virtuoso';
import s from './LazyTable.module.css'
import cts from "../ChildrenTable/ChildrenTable.module.css";
import SvgIcon from '../SvgIcon/SvgIcon';
import arrowDownIcon from '!!raw-loader!./arrow-down.svg';
import arrowUpIcon from '!!raw-loader!./arrow-up.svg';

export type Entity<Fields, LazyFields> = {
  id: string;
  fields: Fields,
  lazyFields: LazyFields | undefined,
  loadLazyFields: () => Promise<LazyFields>,
}

export type Column<ColumnKey extends string, Fields, LazyFields, E extends Entity<Fields, LazyFields>> = {
  id: ColumnKey;
  title: React.ReactNode;
  render: (entity: E) => React.ReactNode;
  sort: (a: E, b: E) => number;
  defaultWidth: number;
  isSticky?: boolean;
  summary?: (entities: E[]) => React.ReactNode;
}

export type Sort<ColumnKey> = { key: ColumnKey, direction: 'asc' | 'desc' };

export type TableProps<ColumnKey extends string, Fields, LazyFields, E extends Entity<Fields, LazyFields>> = {
  columns: Column<ColumnKey, Fields, LazyFields, E>[];
  totalCount: number;
  defaultSort: Sort<ColumnKey>;
};

function Table<ColumnKey extends string, Fields, LazyFields, E extends Entity<Fields, LazyFields>>(props: TableProps<ColumnKey, Fields, LazyFields, E>): React.ReactNode {
  const tableRef = useRef<HTMLDivElement>(null);
  const [sort, setSort] = useState<Sort<ColumnKey>>(props.defaultSort);
  const [itemsRendered, setItemsRendered] = useState<E[]>([]);

  return (
    <div className={s.Table}>
      <div className={cts.Table} ref={tableRef}>
        <TableVirtuoso
          data={topicsToShow}
          overscan={{ main: (tableRef?.current?.clientHeight || 0), reverse: (tableRef?.current?.clientHeight || 0) }}
          fixedHeaderContent={() => (
            <>
              <tr>
                <Th title="Namespaces" sortKey="topic" style={{ position: 'sticky', left: 0, zIndex: 10 }} />
                <Th title="-" sortKey="topicType" style={{ position: 'sticky', left: `calc(${firstColumnWidth} + 34rem)`, zIndex: 10 }} />
                <Th title="Pts." sortKey="partitionsCount" />
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
                <th className={cts.SummaryTh}></th>
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
                partitionsCount={topic.topicType === 'persistent' ? partitionsCount.persistent[topic.topic] : partitionsCount.nonPersistent[topic.topic]}
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
    </div>
  );
}

const Th = (props: { sort: Sort, title: React.ReactNode, sortKey?: ColumnKey, style?: React.CSSProperties }) => {
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
  }

export default Table;
