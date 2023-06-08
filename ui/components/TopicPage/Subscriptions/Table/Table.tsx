import React, { ReactNode, useCallback, useEffect, useState } from 'react';
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

export type ColumnConfig = {
  visibility: 'visible' | 'hidden',
  stickyTo: 'none' | 'left'
  width: number,
};
export type ColumnsConfig<CK extends ColumnKey> = Record<CK, ColumnConfig>;

export type Columns<CK extends ColumnKey, DE, LD> = {
  columns: Record<CK, Column<DE, LD>>,
  defaultConfig: ColumnsConfig<CK>
};

export type Column<DE, LD> = {
  title: ReactNode,
  defaultWidth?: number,
  minWidth: number,
  maxWidth: number,
  renderCell?: (data: DE, lazyData: LD) => ReactNode,
  help?: ReactNode,
  sort?: (a: { data: DE, lazyData: LD }, b: { data: DE, lazyData: LD }) => number,
};

export type Sort<CK extends ColumnKey> = {
  type: 'by-single-column',
  column: CK | undefined,
  direction: 'asc' | 'desc',
} | {
  type: 'none'
};

export type TableProps<CK extends ColumnKey, DE, LD> = {
  tableId: string
  data: DE[]
  lazyData?: {
    loader: (visibleEntries: DE[]) => Promise<Record<DataEntryKey, LD>>
    getKey: (visibleEntries: DE[]) => string
  },
  columns: Columns<CK, DE, LD>
  getId: (entry: DE) => DataEntryKey
  defaultSort?: Sort<CK>
};

function Table<CK extends ColumnKey, DE, LD>(props: TableProps<CK, DE, LD>): ReactNode {
  const tableRef = React.useRef<HTMLDivElement>(null);
  const [lazyData, setLazyData] = useState<Record<DataEntryKey, LD>>({});
  const [itemsRendered, setItemsRendered] = useState<ListItem<DE>[]>([]);
  const [itemsRenderedDebounced] = useDebounce(itemsRendered, 400);
  const [sort, setSort] = useState<Sort<CK>>(props.defaultSort ?? { type: 'none' });
  const { notifyError } = Notifications.useContext();
  const columnsConfig = props.columns.defaultConfig;

  const { data: lazyDataChunk, error: lazyDataChunkError } = useSWR(
    itemsRenderedDebounced.length === 0 ? null : (props.lazyData?.getKey(itemsRenderedDebounced.map(item => item.data!)) || null),
    props.lazyData?.loader || (() => ({})),
  );

  if (lazyDataChunkError) {
    notifyError(`Unable to load additional table info. ${lazyDataChunkError}`);
  }

  useEffect(() => {
    // Avoid visual blinking after each tenants info update request.
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

  return (
    <div className={s.Table} ref={tableRef}>
      <TableVirtuoso
        data={props.data}
        overscan={{
          main: (tableRef?.current?.clientHeight || 0),
          reverse: (tableRef?.current?.clientHeight || 0)
        }}
        fixedHeaderContent={() => (
          <tr>
            {Object.entries<ColumnConfig>(columnsConfig)
              .filter(([_, columnConfig]) => columnConfig.visibility === 'visible')
              .map(([columnKey, columnConfig]) => {
                return (
                  <Th
                    key={columnKey}
                    title={props.columns.columns[columnKey as CK].title}
                    sortKey={props.columns.columns[columnKey as CK].sort ? columnKey as CK : undefined}
                    style={{ width: columnConfig.width }}
                  />
                );
              })}
          </tr>
        )}
        itemContent={(_, entry) => {
          return (
            <>
              {Object.entries<ColumnConfig>(columnsConfig).map(([columnKey, columnConfig]) => {
                return (
                  <td key={columnKey} className={s.Td}>
                    <div style={{ width: columnConfig.width }}>
                      {props.columns.columns[columnKey as CK].renderCell?.(entry, lazyData[props.getId(entry)])}
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
