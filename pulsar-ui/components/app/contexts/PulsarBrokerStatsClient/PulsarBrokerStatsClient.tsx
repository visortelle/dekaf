import React, { ReactNode } from 'react';
import stringify from 'safe-stable-stringify';
import * as Notifications from '../Notifications';
import { MetricsMap, Filter } from '../../../../pages/api/broker-stats/metrics';

export type Value = {
  client: {
    getMetrics: (filters: Filter) => Promise<MetricsMap>;
  }
}

const defaultValue: Value = {
  client: {
    getMetrics: async () => ({}),
  }
};

const Context = React.createContext<Value>(defaultValue);

const apiUrl = 'http://localhost:3000/api';

export const DefaultProvider = ({ children }: { children: ReactNode }) => {
  const { notifyError } = Notifications.useContext();

  const getMetrics: Value['client']['getMetrics'] = async (filter) => {
    const response = await fetch(`${apiUrl}/broker-stats/metrics?filter=${stringify(filter)}`, {}).catch(error => console.error(error));
    if (response === undefined) {
      notifyError(`Unable to get metrics.`);
      return {};
    }

    const json = await response.json();
    if (response.status >= 300) {
      notifyError(`Unable to get metrics: ${json.error!}`);
      return {};
    }

    return json as MetricsMap;
  }

  return (
    <>
      <Context.Provider
        value={{
          client: {
            getMetrics: getMetrics
          },
        }}
      >
        {children}
      </Context.Provider>
    </>
  )
};

export const useContext = () => React.useContext(Context);
