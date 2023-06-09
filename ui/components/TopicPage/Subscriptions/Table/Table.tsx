import React, { ReactNode, useCallback, useEffect, useState, ReactElement } from 'react';
import s from './Table.module.css'
import { isEqual } from 'lodash';
import { ListItem, TableVirtuoso } from 'react-virtuoso';
import SvgIcon from '../../../ui/SvgIcon/SvgIcon';
import arrowDownIcon from './arrow-down.svg';
import arrowUpIcon from './arrow-up.svg';
import { useDebounce } from 'use-debounce';
import * as Notifications from '../../../app/contexts/Notifications';
import useSWR from 'swr';

export type ColumnKey = string;
export type DataEntryKey = string;

export type ColumnConfig<CK> = {
  key: CK,
  visibility: 'visible' | 'hidden',
  stickyTo: 'none' | 'left'
  width: number,
};
export type ColumnsConfig<CK extends ColumnKey> = ColumnConfig<CK>[];

export type Columns<CK extends ColumnKey, DE, LD> = {
  columns: Record<CK, Column<DE, LD>>,
  defaultConfig: ColumnsConfig<CK>
};

export type Column<DE, LD> = {
  title: ReactNode,
  render?: (data: DE, lazyData: LD) => ReactNode,
  help?: ReactNode,
  sortFn?: (a: { data: DE, lazyData: LD }, b: { data: DE, lazyData: LD }) => number,
  defaultWidth?: number,
  minWidth?: number,
  maxWidth?: number,
};

export type Sort<CK extends ColumnKey> = {
  type: 'by-single-column',
  column: CK,
  direction: 'asc' | 'desc',
} | {
  type: 'none'
};

export type TableProps<CK extends ColumnKey, DE, LD> = {
  tableId: string
  data: DE[]
  lazyData?: {
    loader: (visibleEntries: DE[]) => Promise<Record<DataEntryKey, LD>>
  },
  columns: Columns<CK, DE, LD>
  getId: (entry: DE) => DataEntryKey
  defaultSort?: Sort<CK>
};

function Table<CK extends ColumnKey, DE, LD>(props: TableProps<CK, DE, LD>): ReactElement | null {
  const tableRef = React.useRef<HTMLDivElement>(null);
  const [lazyData, setLazyData] = useState<Record<DataEntryKey, LD>>({});
  const [itemsRendered, setItemsRendered] = useState<ListItem<DE>[]>([]);
  const [itemsRenderedDebounced] = useDebounce(itemsRendered, 400);
  const [sort, setSort] = useState<Sort<CK>>(props.defaultSort ?? { type: 'none' });
  const { notifyError } = Notifications.useContext();
  const columnsConfig = props.columns.defaultConfig.filter(column => column.visibility === 'visible');

  const { data: lazyDataChunk, error: lazyDataChunkError } = useSWR(
    itemsRenderedDebounced.length === 0 ?
      null :
      [props.tableId, 'lazy-data'].concat(itemsRenderedDebounced.map(item => props.getId(item.data!))),
    props.lazyData?.loader ?
      () => props.lazyData?.loader(itemsRenderedDebounced.map(v => v.data!)) :
      (() => ({}))
  );

  if (lazyDataChunkError) {
    notifyError(`Unable to load additional table info. ${lazyDataChunkError}`);
  }

  useEffect(() => {
    // Avoid visual blinking after each lazy data update.
    setLazyData(lazyData => ({ ...lazyData, ...lazyDataChunk }));
  }, [lazyDataChunk]);

  const Th = useCallback((props: { title: React.ReactNode, sortKey?: CK, style?: React.CSSProperties }) => {
    const handleColumnHeaderClick = () => {
      if (props.sortKey === undefined) {
        return;
      }

      if (sort.type === 'by-single-column') {
        if (sort.column === props.sortKey) {
          setSort({
            type: 'by-single-column',
            column: props.sortKey,
            direction: sort.direction === 'asc' ? 'desc' : 'asc'
          });
        } else {
          setSort({
            type: 'by-single-column',
            column: props.sortKey,
            direction: 'asc'
          });
        }
      }
    }

    return (
      <th className={s.Th} style={props.style} onClick={handleColumnHeaderClick}>
        <div className={props.sortKey === undefined ? '' : s.SortableTh}>
          {props.title}

          {sort.type === 'by-single-column' && sort.column === props.sortKey && (
            <div className={s.SortableThIcon}>
              <SvgIcon svg={sort.direction === 'asc' ? arrowUpIcon : arrowDownIcon} />
            </div>
          )}
        </div>
      </th>
    );
  }, [sort]);

  const sortedData = React.useMemo(() => {
    if (sort.type === 'none') {
      return props.data;
    }
    if (sort.type === 'by-single-column') {
      const sortFn = props.columns.columns[sort.column].sortFn;
      const sorted = sortFn ?
        props.data.sort((a, b) => sortFn(
          { data: a, lazyData: lazyData[props.getId(a)] },
          { data: b, lazyData: lazyData[props.getId(b)] })
        ) :
        props.data;

      return sort.direction === 'asc' ? sorted : sorted.reverse();
    }
  }, [props.data, sort, lazyData]);

  return (
    <div className={s.Table} ref={tableRef}>
      <TableVirtuoso
        data={sortedData}
        overscan={{
          main: (tableRef?.current?.clientHeight || 0),
          reverse: (tableRef?.current?.clientHeight || 0)
        }}
        fixedHeaderContent={() => (
          <tr>
            {columnsConfig.map((columnConfig) => {
              return (
                <Th
                  key={columnConfig.key}
                  title={props.columns.columns[columnConfig.key].title}
                  sortKey={props.columns.columns[columnConfig.key].sortFn ? columnConfig.key : undefined}
                  style={{ width: columnConfig.width }}
                />
              );
            })}
          </tr>
        )}
        itemContent={(_, entry) => {
          return (
            <>
              {columnsConfig.map((columnConfig) => {
                return (
                  <td key={columnConfig.key} className={s.Td}>
                    <div style={{ width: columnConfig.width }}>
                      {props.columns.columns[columnConfig.key].render?.(entry, lazyData[props.getId(entry)])}
                    </div>
                  </td>
                );
              })}
            </>
          );
        }}
        customScrollParent={tableRef.current || undefined}
        totalCount={props.data?.length}
        itemsRendered={(items) => {
          const isShouldUpdate = !isEqual(itemsRendered, items)
          if (isShouldUpdate) {
            setItemsRendered(() => items);
          }
        }}
      />
    </div>
  );
}

export default Table;
