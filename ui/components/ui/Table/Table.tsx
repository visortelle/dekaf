import React, { ReactNode, useEffect, useState, ReactElement, useMemo } from 'react';
import s from './Table.module.css'
import { isEqual } from 'lodash';
import { ListItem, TableVirtuoso } from 'react-virtuoso';
import SvgIcon from '../SvgIcon/SvgIcon';
import arrowDownIcon from './arrow-down.svg';
import arrowUpIcon from './arrow-up.svg';
import { useDebounce } from 'use-debounce';
import * as Notifications from '../../app/contexts/Notifications';
import useSWR from 'swr';
import { TooltipWrapper } from 'react-tooltip';
import { renderToStaticMarkup } from 'react-dom/server';

export type ColumnKey = string;
export type DataEntryKey = string;

export type ColumnConfig<CK> = {
  key: CK,
  visibility: 'visible' | 'hidden',
  width: number,
  stickyTo?: 'none' | 'left'
};
export type ColumnsConfig<CK extends ColumnKey> = ColumnConfig<CK>[];

export type Columns<CK extends ColumnKey, DE, LD> = {
  columns: Partial<Record<CK, Column<DE, LD>>>,
  defaultConfig: ColumnsConfig<CK>
  help?: Partial<Record<CK, ReactNode>>,
};

export type Column<DE, LD> = {
  title: ReactNode,
  render?: (data: DE, lazyData: LD) => ReactNode,
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

  const Th = (thProps: { title: React.ReactNode, columnKey: CK, isSortable: boolean, style?: React.CSSProperties }) => {
    const handleColumnHeaderClick = () => {
      if (!thProps.isSortable) {
        return;
      }

      setSort((sort) => {
        if (sort.type === 'by-single-column') {
          let direction: 'asc' | 'desc';
          if (sort.column === thProps.columnKey) {
            direction = sort.direction === 'asc' ? 'desc' : 'asc';
          } else {
            direction = 'asc';
          }

          return {
            type: 'by-single-column',
            column: thProps.columnKey,
            direction
          }

        }

        return sort;
      });
    }

    return (
      <th
        className={`${s.Th} ${thProps.isSortable ? s.SortableTh : ''}`}
        style={thProps.style}
        onClick={handleColumnHeaderClick}
      >
        <TooltipWrapper
          className={s.TooltipWrapper}
          html={props.columns.help ? renderToStaticMarkup(<>{props.columns.help[thProps.columnKey]}</>) : undefined}
        >
          <div className={s.ThContent}>
            {thProps.title}

            {(sort.type === 'by-single-column' && sort.column === thProps.columnKey) ? (
              <div className={s.SortableThIcon}>
                <SvgIcon svg={sort.direction === 'asc' ? arrowUpIcon : arrowDownIcon} />
              </div>
            ) : null}
          </div>
        </TooltipWrapper>
      </th>
    );
  };

  const sortedData = useMemo(() => {
    if (sort.type === 'by-single-column') {
      const sortFn = props.columns.columns[sort.column]!.sortFn;
      const sorted = sortFn ?
        props.data.sort((a, b) => sortFn(
          { data: a, lazyData: lazyData[props.getId(a)] },
          { data: b, lazyData: lazyData[props.getId(b)] })
        ) :
        props.data;

      return sort.direction === 'asc' ? sorted : [...sorted].reverse();
    }

    return props.data;
  }, [props.data, sort, lazyData]);

  if (props.data.length === 0) {
    return <div className={s.NothingToShow}>Nothing to show.</div>;
  }

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
              const style: React.CSSProperties = columnConfig.stickyTo === 'left' ? { position: 'sticky', left: 0, zIndex: 10 } : {};

              return (
                <Th
                  key={columnConfig.key}
                  title={props.columns.columns[columnConfig.key]!.title}
                  columnKey={columnConfig.key}
                  isSortable={Boolean(props.columns.columns[columnConfig.key]!.sortFn)}
                  style={{ width: columnConfig.width, ...style }}
                />
              );
            })}
          </tr>
        )}
        itemContent={(_, entry) => {
          return (
            <>
              {columnsConfig.map((columnConfig) => {
                const v = props.columns.columns[columnConfig.key]!.render?.(entry, lazyData[props.getId(entry)]);
                const style: React.CSSProperties = columnConfig.stickyTo === 'left' ? { position: 'sticky', left: 0, zIndex: 10 } : {};

                return (
                  <td key={columnConfig.key} className={s.Td} style={style}>
                    <div style={{ width: columnConfig.width }}>
                      {v === undefined ? (
                        <div className={s.NoData}>-</div>
                      ) : v}
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
