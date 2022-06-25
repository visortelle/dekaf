import React, { ReactNode } from 'react';
import { TreePath } from '../../../NavigationTree/TreeView';
import { getTreeNodesChildrenCount, getTenantsNamespacesCount } from './get-xs-children-count';
import { TenantInfo, getTenantsInfo } from './get-xs';
import { TreePathStr } from './types';

const batchApiUrl = `http://localhost:3001/batch`;
const brokerWebApiUrl = 'http://localhost:3001/pulsar-broker-web';

export type Value = {
  client: {
    getTreeNodesChildrenCount: (paths: TreePath[]) => Promise<Record<TreePathStr, number>>;
    getTenantsNamespacesCount: (tenants: string[]) => Promise<Record<string, number>>;
    getTenantsInfo: (tenants: string[]) => Promise<Record<string, TenantInfo>>;
  }
}

const defaultValue: Value = {
  client: {
    getTreeNodesChildrenCount: async () => ({}),
    getTenantsNamespacesCount: async () => ({}),
    getTenantsInfo: async () => ({}),
  }
};

const Context = React.createContext<Value>(defaultValue);

export const DefaultProvider = ({ children }: { children: ReactNode }) => {
  return (
    <>
      <Context.Provider
        value={{
          client: {
            getTreeNodesChildrenCount: (paths: TreePath[]) => getTreeNodesChildrenCount(paths, batchApiUrl, brokerWebApiUrl),
            getTenantsNamespacesCount: (tenants: string[]) => getTenantsNamespacesCount(tenants, batchApiUrl, brokerWebApiUrl),
            getTenantsInfo: (tenants: string[]) => getTenantsInfo(tenants, batchApiUrl, brokerWebApiUrl),
          }
        }}
      >
        {children}
      </Context.Provider>
    </>
  )
};

export const useContext = () => React.useContext(Context);
