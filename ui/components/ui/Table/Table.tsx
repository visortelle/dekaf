import React, { ReactNode, useEffect, useState, ReactElement, useMemo } from 'react';
import s from './Table.module.css'
import { isEqual } from 'lodash';
import { ListItem, TableVirtuoso } from 'react-virtuoso';
import SvgIcon from '../SvgIcon/SvgIcon';
import arrowDownIcon from './arrow-down.svg';
import arrowUpIcon from './arrow-up.svg';
import { useDebounce } from 'use-debounce';
import * as Notifications from '../../app/contexts/Notifications';
import useSWR, { SWRConfiguration, mutate } from 'swr';
import { renderToStaticMarkup } from 'react-dom/server';
import NothingToShow from '../NothingToShow/NothingToShow';
import * as AppContext from '../../app/contexts/AppContext';
import * as I18n from '../../app/contexts/I18n/I18n';
import Toggle from '../Toggle/Toggle';
import SmallButton from '../SmallButton/SmallButton';
import refreshIcon from './refresh.svg';
import NoData from '../NoData/NoData';
import { tooltipId } from '../Tooltip/Tooltip';

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
};

function Table<CK extends ColumnKey, DE, LD>(props: TableProps<CK, DE, LD>): ReactElement | null {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [lazyData, setLazyData] = useState<Record<DataEntryKey, LD>>({});
  const [lazyDataLoading, setLazyDataLoading] = useState<Record<string, boolean>>({});
  const [itemsRendered, setItemsRendered] = useState<ListItem<DE>[]>([]);
  const [itemsRenderedDebounced] = useDebounce(itemsRendered, 250);
  const [sort, setSort] = useState<Sort<CK>>(props.defaultSort ?? { type: 'none' });
  const { notifyError } = Notifications.useContext();
  const columnsConfig = props.columns.defaultConfig.filter(column => column.visibility === 'visible');
  const { autoRefresh, setAutoRefresh } = AppContext.useContext();
  const [lastUpdated, setLastUpdated] = useState<Date | undefined>();
  const [filtersInUse, setFiltersInUse] = useState<FiltersInUse<CK>>(props.defaultFiltersInUse ?? {});
  const [filtersInUseDebounced] = useDebounce(filtersInUse, 400);

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
    [props.tableId, 'lazy-data'].concat(itemsRenderedDebounced.map(item => props.getId(item.data!)))

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
    style?: React.CSSProperties
  };
  const Th = useMemo(() => (thProps: ThProps) => {
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

    const isColumnFiltered = Boolean(filtersInUse[thProps.columnKey]);

    return (
      <th
        className={`${s.Th} ${thProps.isSortable ? s.SortableTh : ''}`}
        style={thProps.style}
        onClick={handleColumnHeaderClick}
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
      </th>
    );
  }, [sort, props.columns, filtersInUse]);

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

    if (sort.type === 'by-single-column') {
      const sortFn = props.columns.columns[sort.column]!.sortFn;
      const sorted = sortFn ?
        dataToSort.sort((a, b) => sortFn(
          { data: a, lazyData: lazyData[props.getId(a)] },
          { data: b, lazyData: lazyData[props.getId(b)] })
        ) :
        dataToSort;

      return sort.direction === 'asc' ? sorted : [...sorted].reverse();
    }

    return data;
  }, [loadedData, sort, lazyData, filtersInUseDebounced]);

  if (data.length === 0) {
    return (
      <div className={s.NothingToShow}>
        <NothingToShow reason={isDataLoading ? 'loading-in-progress' : 'no-items-found'} />
      </div>
    );
  }

  return (
    <div className={s.Table}>
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
            <div>
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
              />

              <Toggle
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

      <div className={s.ScrollContainer} ref={scrollContainerRef}>
        <TableVirtuoso
          data={sortedData}
          overscan={{
            main: (scrollContainerRef?.current?.clientHeight || 0),
            reverse: (scrollContainerRef?.current?.clientHeight || 0)
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
                    style={{ width: columnConfig.width, ...style }}
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
                      <div className={`${s.TdContent} ${isLoading ? s.LoadingPattern : ''}`} style={{ width: columnConfig.width }} title={typeof v === 'string' ? v : undefined}>
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
          customScrollParent={scrollContainerRef.current || undefined}
          totalCount={data?.length}
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

export default Table;
