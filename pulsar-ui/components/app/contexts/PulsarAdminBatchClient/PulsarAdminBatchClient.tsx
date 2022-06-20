import React, { ReactNode, useEffect, useState } from 'react';
import * as PulsarAdminClient from '../PulsarAdminClient';
import pulsarAdmin from 'pulsar-admin-client-fetch';
import fetchIntercept from 'fetch-intercept';
import { fromPairs, uniqBy } from 'lodash';
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

const sleep = (time: number) => new Promise(res => setTimeout(res, time));

type Fetchers = Record<string, pulsarAdmin.CancelablePromise<any>>;

// XXX - this is relies on the fact that PulsarAdminClient uses fetch requests under the hood.
// Probably it would be better to have a server-side implementation for batch requests.
async function getBatchRequests(fetchers: Fetchers, getNameByUrl: (url: string) => string): Promise<BatchRequest[]> {
  let batchRequests: BatchRequest[] = [];

  try {
    const fetcherKeys = Object.keys(fetchers);
    for (let i = 0; i < fetcherKeys.length; i++) {
      const fetcherKey = fetcherKeys[i];
      const promise = fetchers[fetcherKey];

      const unregister = fetchIntercept.register({
        request: function (url, config) {
          batchRequests.push({
            name: getNameByUrl(url),
            url: `${uiServerUrl}${url}`,
            headers: fromPairs(config.headers && config.headers.entries()) || {},
            method: config.method || 'GET',
          });
          batchRequests = uniqBy(batchRequests, 'name');
          promise.cancel();
          return [url, config];
        }
      });

      promise.finally(() => {
        unregister();
      });
    }
  } catch (err) {
    // ignore
  }

  let isSleep = true;
  while (isSleep) {
    await sleep(500);
    if (batchRequests.length === Object.keys(fetchers).length) {
      isSleep = false;
    }
  }

  return Promise.resolve(batchRequests);
}

const Context = React.createContext<Value>(defaultValue);

export const DefaultProvider = ({ children }: { children: ReactNode }) => {
  const adminClient = PulsarAdminClient.useContext().client;

  const getTenantsNamespaces = async (tenants: string[]): Promise<Record<string, string[]>> => {
    const ps = fromPairs(tenants.map(tenant => [tenant, adminClient.namespaces.getTenantNamespaces(tenant).catch(() => undefined)])) as Fetchers;
    const batchRequests = await getBatchRequests(ps, (url) => url.split('/').pop() || '');
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
