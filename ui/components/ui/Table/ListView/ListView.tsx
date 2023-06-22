import { ReactElement, useState } from 'react';
import s from './ListView.module.css'
import { ColumnKey, TableProps } from '../Table';
import { SWRConfiguration } from 'swr';
import * as AppContext from '../../../app/contexts/AppContext';
import * as Notifications from '../../../app/contexts/Notifications';
import useSWR from 'swr';
import ts from '../Table.module.css'

export type ListViewProps = {};

function ListView<CK extends ColumnKey, DE, LD>(props: TableProps<CK, DE, LD>): ReactElement | null {
  const { notifyError } = Notifications.useContext();
  const { autoRefresh, setAutoRefresh } = AppContext.useContext();
  const [lastUpdated, setLastUpdated] = useState<Date | undefined>();
  const swrOptions: SWRConfiguration = {
    refreshInterval: autoRefresh.type === 'enabled' ? props.autoRefresh.intervalMs : 0,
  }

  const { data: loadedData, error: loadedDataError } = useSWR(
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
  const lazyDataLoadedCacheKey = [props.tableId, 'lazy-data'].concat(data.map(item => props.getId(item.data!)))

  return (
    <div className={s.ListView}>

    </div>
  );
}

export default ListView;
