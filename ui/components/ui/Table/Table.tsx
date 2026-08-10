import React, { ReactNode, useEffect, useState, ReactElement, useMemo } from 'react';
import s from './Table.module.css'
import { isEqual } from 'lodash';
import { ListItem, TableVirtuoso } from 'react-virtuoso';
import SvgIcon from '../SvgIcon/SvgIcon';
import arrowDownIcon from './arrow-down.svg';
import arrowUpIcon from './arrow-up.svg';
import { useDebounce } from 'use-debounce';
import { useColumnWidths, ColumnConstraint } from '../resizable/useColumnWidths';
import ColumnResizeHandle from '../resizable/ColumnResizeHandle';
import { useColumnOrder } from '../resizable/useColumnOrder';
import * as Notifications from '../../app/contexts/Notifications';
import useSWR, { SWRConfiguration, mutate } from 'swr';
import { renderToStaticMarkup } from 'react-dom/server';
import NothingToShow from '../NothingToShow/NothingToShow';
import { AutoRefresh } from '../../app/contexts/AppContext';
import * as I18n from '../../app/contexts/I18n/I18n';
import useLocalStorage from 'use-local-storage-state';
import { localStorageKeys } from '../../local-storage-keys';
import Toggle from '../Toggle/Toggle';
import SmallButton from '../SmallButton/SmallButton';
import refreshIcon from './refresh.svg';
import NoData from '../NoData/NoData';
import { tooltipId } from '../Tooltip/Tooltip';
import { sortTableData } from './sorting';

import { TableFilterDescriptor, TableFilterValue } from './filters/types';
import filterIcon from './filter.svg';
import FiltersToolbar, { FilterInUse } from './FiltersToolbar/FiltersToolbar';

export type ColumnKey = string;
export type DataEntryKey = string;

export type AutoRefreshConfig = {
  periodsMs: number[]
};

export type AutoRefreshValue = {
  type: "disabled"
} | {
  type: "enabled",
  periodMs: number
};

export type ColumnConfig<CK> = {
  columnKey: CK,
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
  render: (data: DE, lazyData?: LD) => ReactNode,
  sortFn?: (a: { data: DE, lazyData: LD | undefined }, b: { data: DE, lazyData: LD | undefined }) => number,
  /** Marks rows whose rendered sort value is absent. Missing rows stay after populated rows in
    * both directions; unlike encoding absence in sortFn, this is not inverted by descending sort. */
  isSortValueMissing?: (entry: { data: DE, lazyData: LD | undefined }) => boolean,
  filter?: {
    descriptor: TableFilterDescriptor,
    testFn: (data: DE, lazyData: LD | undefined, filterValue: TableFilterValue) => boolean,
  },
  defaultWidth?: number,
  minWidth?: number,
  maxWidth?: number,
  isLazy?: boolean,
};

export type Sort<CK extends ColumnKey> = {
  type: 'by-single-column',
  column: CK,
  direction: 'asc' | 'desc',
} | {
  type: 'none'
};

export type FiltersInUse<CK extends string> = Partial<Record<CK, FilterInUse>>;

export type TableProps<CK extends ColumnKey, DE, LD> = {
  tableId: string,
  dataLoader: {
    cacheKey: string[] | null,
    loader: () => Promise<DE[]>,
  }
  lazyDataLoader?: {
    loader: (visibleEntries: DE[]) => Promise<Record<DataEntryKey, LD>>
  },
  columns: Columns<CK, DE, LD>
  getId: (entry: DE) => DataEntryKey
  defaultSort?: Sort<CK>
  defaultFiltersInUse?: FiltersInUse<CK>
  autoRefresh: {
    intervalMs: number,
  },
  itemNamePlural?: string,
  toolbar?: { visibility: 'visible' | 'hidden' },
  /** 'small' tightens paddings and type for dense, embedded tables (e.g. the Tools panel).
    * Purely presentational - every behavior is identical. */
  size?: 'default' | 'small',
  /** Rows this returns true for stay FIRST under every sort, in both directions - for summary
    * rows that describe the table rather than compete with it. Column sortFns stay direction-blind
    * plain comparators; a comparator cannot hold a row on top by itself, because 'desc' is the
    * reverse of the sorted array and would flip it to the bottom. */
  pinFirst?: (dataEntry: DE) => boolean,
};

function Table<CK extends ColumnKey, DE, LD>(props: TableProps<CK, DE, LD>): ReactElement | null {
  // State, not a ref: TableVirtuoso must first mount with the REAL scroll parent. Mounting with
  // undefined and switching to customScrollParent on a later render leaves a 0-height viewport
  // measurement that only a window resize refreshes - no rows render until then.
  const [scrollContainer, setScrollContainer] = useState<HTMLDivElement | null>(null);
  const [lazyData, setLazyData] = useState<Record<DataEntryKey, LD>>({});
  const [lazyDataLoading, setLazyDataLoading] = useState<Record<string, boolean>>({});
  const [itemsRendered, setItemsRendered] = useState<ListItem<DE>[]>([]);
  const [itemsRenderedDebounced] = useDebounce(itemsRendered, 250);
  const [sort, setSort] = useState<Sort<CK>>(props.defaultSort ?? { type: 'none' });
  const { notifyError } = Notifications.useContext();
  const visibleConfig = props.columns.defaultConfig.filter(column => column.visibility === 'visible');
  // Sticky-left columns are pinned to the FRONT and are not reorderable: a sticky column in the
  // middle of the scroll area would float over its neighbours. Everything else can be dragged
  // into any order, and the order is remembered per table like the widths are.
  const stickyConfig = visibleConfig.filter(column => column.stickyTo === 'left');
  const reorderableConfig = visibleConfig.filter(column => column.stickyTo !== 'left');
  const { order: columnOrder, moveColumn } = useColumnOrder<CK>(
    props.tableId,
    reorderableConfig.map(column => column.columnKey)
  );
  const columnsConfig = [
    ...stickyConfig,
    ...columnOrder.flatMap(columnKey => reorderableConfig.filter(column => column.columnKey === columnKey))
  ];
  const draggingColumnRef = React.useRef<CK | undefined>(undefined);
  // ONE GLOBAL auto-refresh preference shared by every table - an owner design decision
  // ("we either want to refresh any table, or not"), deliberately NOT per-table.
  // use-local-storage-state syncs all hook instances on the same key, so flipping the toggle on
  // any table updates them all (same behavior the old AppContext-held flag had, minus the plumbing).
  const [autoRefresh, setAutoRefresh] = useLocalStorage<AutoRefresh>(
    localStorageKeys.autoRefresh,
    { defaultValue: { type: 'enabled' } }
  );
  const [lastUpdated, setLastUpdated] = useState<Date | undefined>();
  const [filtersInUse, setFiltersInUse] = useState<FiltersInUse<CK>>(props.defaultFiltersInUse ?? {});
  const [filtersInUseDebounced] = useDebounce(filtersInUse, 400);

  const columnDefaultWidths = useMemo(
    () => Object.fromEntries(props.columns.defaultConfig.map(c => [c.columnKey, c.width])) as Record<CK, number>,
    [props.columns.defaultConfig]
  );
  const columnConstraints = useMemo(
    () => Object.fromEntries(
      Object.entries(props.columns.columns).map(([ck, col]) =>
        [ck, { minWidth: (col as Column<DE, LD>)?.minWidth, maxWidth: (col as Column<DE, LD>)?.maxWidth }])
    ) as Partial<Record<CK, ColumnConstraint>>,
    [props.columns.columns]
  );
  const { getWidth: getColumnWidth, startResize: startColumnResize, suppressSortClickRef } =
    useColumnWidths<CK>(props.tableId, columnDefaultWidths, columnConstraints);

  const i18n = I18n.useContext();

  const swrOptions: SWRConfiguration = {
    refreshInterval: autoRefresh.type === 'enabled' ? props.autoRefresh.intervalMs : 0,
  }

  const { data: loadedData, error: loadedDataError, isLoading: isDataLoading } = useSWR(
    props.dataLoader.cacheKey,
    props.dataLoader.loader,
    {
      ...swrOptions,
      onSuccess: () => setLastUpdated(new Date()),
    }
  );

  if (loadedDataError) {
    notifyError(`Unable to load table data. ${loadedDataError}`);
  }

  const data = loadedData ?? [];
  const lazyDataLoadedCacheKey = itemsRenderedDebounced.length === 0 ?
    null :
    [props.tableId, 'lazy-data']
      .concat(props.dataLoader.cacheKey || [])
      .concat(itemsRenderedDebounced.map(item => props.getId(item.data!)))

  const { data: lazyDataChunk, error: lazyDataChunkError } = useSWR(
    lazyDataLoadedCacheKey,
    props.lazyDataLoader?.loader ?
      () => {
        const itemsToLoad = itemsRenderedDebounced.map(v => v.data!);
        setLazyDataLoading(loadingItems => ({
          ...loadingItems,
          ...Object.fromEntries(itemsToLoad.map(item => [props.getId(item), true]))
        }));

        return props.lazyDataLoader?.loader(itemsToLoad);
      } :
      (() => ({})),
    swrOptions
  );

  if (lazyDataChunkError) {
    notifyError(`Unable to load additional table data. ${lazyDataChunkError}`);
  }

  useEffect(() => {
    // Avoid visual blinking after each lazy data update.
    setLazyData(lazyData => ({ ...lazyData, ...lazyDataChunk }));

    const loadedIds = Object.keys(lazyDataChunk ?? {});
    setLazyDataLoading(loadingItems => Object.fromEntries(Object.entries(loadingItems).filter(([id]) => !loadedIds.includes(id))));
  }, [lazyDataChunk]);

  type ThProps = {
    title: React.ReactNode,
    columnKey: CK,
    isSortable: boolean,
    filter: Column<DE, LD>['filter'],
    style?: React.CSSProperties,
    isDraggable?: boolean
  };
  const Th = useMemo(() => (thProps: ThProps) => {
    const handleColumnHeaderClick = () => {
      if (suppressSortClickRef.current) {
        return;
      }
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

    const isColumnFiltered = Boolean(filtersInUse[thProps.columnKey]);

    // Native HTML5 drag: the resize handle's mousedown sets suppressSortClickRef before any drag
    // gesture can begin, so a resize never turns into a column drag. The drag-over indicator is
    // toggled IMPERATIVELY (classList), never via state: this Th component's TYPE is recreated
    // when its memo deps change, and a state update mid-drag would remount the th under the
    // cursor - the browser then abandons the drop and the drag silently does nothing.
    const dragProps = !thProps.isDraggable ? {} : {
      draggable: true,
      onDragStart: (e: React.DragEvent) => {
        if (suppressSortClickRef.current) {
          e.preventDefault();
          return;
        }
        draggingColumnRef.current = thProps.columnKey;
        e.dataTransfer.setData('text/plain', thProps.columnKey);
        e.dataTransfer.effectAllowed = 'move';
      },
      onDragEnd: () => {
        draggingColumnRef.current = undefined;
      },
      onDragOver: (e: React.DragEvent) => {
        if (draggingColumnRef.current === undefined) {
          return;
        }
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        (e.currentTarget as HTMLElement).classList.add(s.ThDragOver);
      },
      onDragLeave: (e: React.DragEvent) => {
        (e.currentTarget as HTMLElement).classList.remove(s.ThDragOver);
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        (e.currentTarget as HTMLElement).classList.remove(s.ThDragOver);
        const dragged = draggingColumnRef.current;
        draggingColumnRef.current = undefined;
        if (dragged !== undefined && dragged !== thProps.columnKey) {
          moveColumn(dragged, thProps.columnKey);
        }
      }
    };

    return (
      <th
        className={`${s.Th} ${thProps.isSortable ? s.SortableTh : ''}`}
        style={thProps.style}
        onClick={handleColumnHeaderClick}
        data-testid="table-th"
        data-column-key={thProps.columnKey}
        data-sort-direction={(sort.type === 'by-single-column' && sort.column === thProps.columnKey) ? sort.direction : undefined}
        {...dragProps}
      >
        <div
          data-tooltip-id={tooltipId}
          data-tooltip-html={props.columns.help ? renderToStaticMarkup(<>{props.columns.help[thProps.columnKey]}</>) : undefined}
        >
          <div className={s.ThContent}>
            {thProps.title}

            <div className={s.ThIcons}>
              {(thProps.filter !== undefined && !isColumnFiltered) ? (
                <div
                  className={s.FilterableThIcon}
                  title="Filter by this column"
                  data-testid="table-filter-icon"
                  onClick={(e) => {
                    e.stopPropagation();

                    if (isColumnFiltered) {
                      return;
                    }

                    setFiltersInUse(filtersInUse => {
                      const filter = thProps.filter;
                      if (filter === undefined) {
                        return filtersInUse;
                      }

                      const filterInUse: FilterInUse = {
                        state: 'active',
                        value: filter.descriptor.defaultValue
                      };
                      return { ...filtersInUse, [thProps.columnKey]: filterInUse };
                    });
                  }}
                >
                  <SvgIcon svg={filterIcon} />
                </div>
              ) : null}

              {(sort.type === 'by-single-column' && sort.column === thProps.columnKey) ? (
                <div className={s.SortableThIcon}>
                  <SvgIcon svg={sort.direction === 'asc' ? arrowUpIcon : arrowDownIcon} />
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <ColumnResizeHandle onResizeStart={(clientX) => startColumnResize(thProps.columnKey, clientX)} />
      </th>
    );
  }, [sort, props.columns, filtersInUse, startColumnResize, moveColumn]);

  const sortedData = useMemo(() => {
    const activeFilters = Object.entries<FilterInUse>(filtersInUseDebounced as Record<string, FilterInUse>).filter(([_, filter]) => {
      return filter.state === 'active';
    }) as [CK, FilterInUse][];

    const dataToSort = data.filter((de) => {
      return activeFilters.every(([columnKey, filter]) => {
        const testFn = props.columns.columns[columnKey]?.filter?.testFn;
        if (testFn === undefined) {
          return true;
        }

        const testResult = testFn(de, lazyData[props.getId(de)], filter.value);
        return testResult;
      });
    });

    const pin = (rows: DE[]): DE[] => {
      const pinFirst = props.pinFirst;
      if (pinFirst === undefined) {
        return rows;
      }
      return [...rows.filter((de) => pinFirst(de)), ...rows.filter((de) => !pinFirst(de))];
    };

    if (sort.type === 'by-single-column') {
      const column = props.columns.columns[sort.column]!;
      const sortFn = column.sortFn;
      const entryOf = (dataEntry: DE) => ({ data: dataEntry, lazyData: lazyData[props.getId(dataEntry)] });
      if (sortFn === undefined) {
        return pin(dataToSort);
      }

      return sortTableData({
        data: dataToSort,
        direction: sort.direction,
        sortFn,
        entryOf,
        isSortValueMissing: column.isSortValueMissing,
        // The synthetic summary is pinned only after column ordering.
        pinFirst: props.pinFirst
      });
    }

    return pin(data);
  }, [loadedData, sort, lazyData, filtersInUseDebounced, props.pinFirst]);

  if (data.length === 0) {
    return (
      <div className={s.NothingToShow}>
        <NothingToShow reason={isDataLoading ? 'loading-in-progress' : 'no-items-found'} />
      </div>
    );
  }

  return (
    <div className={`${s.Table} ${props.size === 'small' ? s.SizeSmall : ''}`}>
      <div className={s.Toolbars}>
        {Boolean(Object.keys(filtersInUse).length) && <div className={s.FiltersToolbar}>
          <FiltersToolbar<CK>
            filters={filtersInUse}
            onChange={setFiltersInUse}
            columns={props.columns}
          />
        </div>}

        {props.toolbar?.visibility !== 'hidden' && (
          <div className={s.Toolbar}>
            <div data-testid="table-counter">
              <strong>{sortedData.length}</strong> of <strong>{data.length}</strong> {props.itemNamePlural || 'items'}
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '24rem' }}>
              <SmallButton
                type='regular'
                title="Refresh table data"
                onClick={async () => {
                  await mutate(props.dataLoader.cacheKey);
                  await mutate(lazyDataLoadedCacheKey);
                }}
                svgIcon={refreshIcon}
                testId="table-refresh"
              />

              <Toggle
                testId="table-auto-refresh"
                label='Auto refresh'
                value={autoRefresh.type === 'enabled'}
                onChange={(v) => setAutoRefresh({ ...autoRefresh, type: v ? 'enabled' : 'disabled' })}
              />

              <div style={{ display: 'flex', gap: '0.3ch' }}>
                <strong>Last updated: </strong>
                <span style={{ width: '7ch', textAlign: 'right' }}>{lastUpdated === undefined ? <NoData /> : i18n.formatTime(lastUpdated)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={s.ScrollContainer} ref={setScrollContainer}>
        {scrollContainer !== null && <TableVirtuoso
          data={sortedData}
          overscan={{
            main: (scrollContainer.clientHeight || 0) / 3,
            reverse: (scrollContainer.clientHeight || 0) / 3
          }}
          fixedHeaderContent={() => (
            <tr>
              {columnsConfig.map((columnConfig) => {
                const style: React.CSSProperties = columnConfig.stickyTo === 'left' ? { position: 'sticky', left: 0, zIndex: 10 } : {};

                return (
                  <Th
                    key={columnConfig.columnKey}
                    title={props.columns.columns[columnConfig.columnKey]!.title}
                    columnKey={columnConfig.columnKey}
                    isSortable={Boolean(props.columns.columns[columnConfig.columnKey]!.sortFn)}
                    filter={props.columns.columns[columnConfig.columnKey]!.filter}
                    style={{ width: getColumnWidth(columnConfig.columnKey), ...style }}
                    isDraggable={columnConfig.stickyTo !== 'left'}
                  />
                );
              })}
            </tr>
          )}
          itemContent={(_, entry) => {
            const entryId = props.getId(entry);
            const isLoading = (lazyData[entryId] === undefined) && Boolean(lazyDataLoading[entryId]);

            return (
              <>
                {columnsConfig.map((columnConfig) => {
                  const v = props.columns.columns[columnConfig.columnKey]!.render?.(entry, lazyData[entryId]);
                  const style: React.CSSProperties = columnConfig.stickyTo === 'left' ? { position: 'sticky', left: 0, zIndex: 10 } : {};
                  const isLazy = Boolean(props.columns.columns[columnConfig.columnKey]?.isLazy);

                  return (
                    <td
                      key={columnConfig.columnKey}
                      className={`${s.Td}`}
                      style={style}
                    >
                      <div className={`${s.TdContent} ${(isLoading && isLazy) ? s.LoadingPattern : ''}`} style={{ width: getColumnWidth(columnConfig.columnKey) }} title={typeof v === 'string' ? v : undefined}>
                        {(isLoading && isLazy) ? <div className={s.LoadingPlaceholder} /> : null}
                        {(v === undefined && !isLoading) ? (
                          <div className={s.NoData}>-</div>
                        ) : v}
                      </div>
                    </td>
                  );
                })}
              </>
            );
          }}
          customScrollParent={scrollContainer}
          totalCount={data?.length}
          itemsRendered={(items) => {
            const isShouldUpdate = !isEqual(itemsRendered, items)
            if (isShouldUpdate) {
              setItemsRendered(() => items);
            }
          }}
        />}
      </div>
    </div>
  );
}

export default Table;
