import React, { ReactNode } from 'react';
import * as PulsarAdminClient from '../PulsarAdminClient';
import _ from 'lodash';

const batchApiUrl = `http://localhost:3000/api/batch`;
const uiServerUrl = 'http://localhost:3000';

export type Value = {
  client?: {
    getTenantsNamespaces: (tenants: string[]) => Promise<Record<string, string[]>>;
  }
}

const defaultValue: Value = {
  client: {
    getTenantsNamespaces: async () => ({})
  }
};

type BatchRequest = {
  name: string;
  url: string;
  method: string;
  headers: Record<string, string>;
}

const Context = React.createContext<Value>(defaultValue);

export const DefaultProvider = ({ children }: { children: ReactNode }) => {
  const getTenantsNamespaces = async (tenants: string[]): Promise<Record<string, string[]>> => {
    const batchRequests: BatchRequest[] = tenants.map(tenant => ({
      name: `${tenant}`,
      url: `${uiServerUrl}/api/pulsar-broker-web/admin/v2/namespaces/${tenant}`,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    }));

    const res = await fetch(batchApiUrl, { method: 'POST', body: JSON.stringify(batchRequests) }).catch(() => undefined);
    if (res === undefined) {
      return {};
    }
    const result = _(await res.json()).toPairs().map(([name, data]) => [name, Array.isArray(data.body) ? data.body : []]).fromPairs().value();
    return result;
  }

  return (
    <>
      <Context.Provider
        value={{
          client: {
            getTenantsNamespaces
          }
        }}
      >
        {children}
      </Context.Provider>
    </>
  )
};

export const useContext = () => React.useContext(Context);
