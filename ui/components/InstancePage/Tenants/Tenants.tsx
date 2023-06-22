import React from 'react';
import s from './Tenants.module.css'
import * as GrpcClient from '../../app/contexts/GrpcClient/GrpcClient';
import * as Notifications from '../../app/contexts/Notifications';
import * as I18n from '../../app/contexts/I18n/I18n';
import * as pb from '../../../grpc-web/tools/teal/pulsar/ui/tenant/v1/tenant_pb';
import Table from '../../ui/Table/Table';
import { help } from './help';
import { Code } from '../../../grpc-web/google/rpc/code_pb';
import Link from '../../ui/Link/Link';
import { routes } from '../../routes';

export type ColumnKey =
  'tenantName' |
  'allowedClusters' |
  'adminRoles' |
  'namespacesCount';

export type DataEntry = {
  tenantName: string;
}

export type LazyDataEntry = {
  namespacesCount?: number;
  allowedClusters?: string[];
  adminRoles?: string[];
};

export type TenantsProps = {};
const Tenants: React.FC<TenantsProps> = (props) => {
  const { tenantServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const i18n = I18n.useContext();

  const dataLoaderCacheKey = ['tenants-table'];
  const dataLoader = async () => {
    const req = new pb.ListTenantsRequest();
    const res = await tenantServiceClient.listTenants(req, null)
      .catch((err) => notifyError(`Unable to list tenants. ${err}`));

    if (res === undefined) {
      return [];
    }

    return dataEntriesFromPb(res);
  }

  return (
    <div className={s.Page}>
      <Table<ColumnKey, DataEntry, LazyDataEntry>
        columns={{
          help,
          columns: {
            tenantName: {
              title: 'Tenant Name',
              render: (de) => i18n.withVoidDefault(de.tenantName, v => (
                <Link to={`${routes.tenants.tenant.overview._.get({ tenant: v })}`}>
                  {v}
                </Link>
              )),
              sortFn: (a, b) => (a.data.tenantName || '').localeCompare(b.data.tenantName || ''),
              filter: {
                descriptor: {
                  type: 'string',
                  defaultValue: { type: 'string', value: '' }
                },
                testFn: (de, _, filterValue) => {
                  if (filterValue.type !== 'string') {
                    return true
                  };

                  return de.tenantName.includes(filterValue.value);
                },
              }
            },
            namespacesCount: {
              title: 'Namespaces',
              render: (_, ld) => i18n.withVoidDefault(ld?.namespacesCount, v => (
                <Link to={`${routes.tenants.tenant.namespaces._.get({ tenant: _.tenantName || '' })}`}>
                  {v}
                </Link>
              )),
            },
            allowedClusters: {
              title: 'Allowed Clusters',
              render: (_, ld) => i18n.withVoidDefault(ld?.allowedClusters, v => v.join(', ')),
            },
            adminRoles: {
              title: 'Admin Roles',
              render: (_, ld) => i18n.withVoidDefault(ld?.adminRoles, v => v.join(', ')),
            }
          },
          defaultConfig: [
            { columnKey: 'tenantName', width: 300, visibility: 'visible', stickyTo: 'left' },
            { columnKey: 'namespacesCount', width: 100, visibility: 'visible' },
            { columnKey: 'allowedClusters', width: 200, visibility: 'visible' },
            { columnKey: 'adminRoles', width: 300, visibility: 'visible' },
          ],
        }}
        dataLoader={{
          cacheKey: dataLoaderCacheKey,
          loader: dataLoader
        }}
        lazyDataLoader={{
          loader: async (des) => {
            const req = new pb.GetTenantsRequest();
            req.setTenantsList(des.map(e => e.tenantName || ''));
            req.setIsGetNamespacesCount(true);

            const res = await tenantServiceClient.getTenants(req, null).catch((err) => notifyError(`Unable to get tenants. ${err}`));
            if (res === undefined) {
              return {};
            }

            if (res.getStatus()?.getCode() !== Code.OK) {
              notifyError(`Unable to get tenants. ${res.getStatus()?.getMessage()}`);
              return {};
            }

            const tenantsPb = res.getTenantsMap();
            const namespacesCountPb = res.getNamespacesCountMap();

            const lazyDataEntryPairs: [string, LazyDataEntry][] = des.map((de) => {
              const tenantPb = tenantsPb.get(de.tenantName || '');

              const adminRoles = tenantPb?.getAdminRolesList();
              const allowedClusters = tenantPb?.getAllowedClustersList();

              const ld: LazyDataEntry = {
                adminRoles: adminRoles?.length ? adminRoles : undefined,
                allowedClusters: allowedClusters?.length ? allowedClusters : undefined,
                namespacesCount: namespacesCountPb.get(de.tenantName || '')
              };

              return [de.tenantName || '', ld];
            });

            return Object.fromEntries(lazyDataEntryPairs);
          }
        }}
        autoRefresh={{
          intervalMs: 5000
        }}
        getId={(entry) => entry.tenantName ?? ''}
        tableId='tenants-table'
        defaultSort={{ column: 'tenantName', direction: 'asc', type: 'by-single-column' }}
        defaultFiltersInUse={{
          'tenantName': {
            state: 'active',
            value: { 'type': 'string', value: '' }
          }
        }}
      />
    </div>
  );
}

function dataEntriesFromPb(res: pb.ListTenantsResponse): DataEntry[] {
  return res.getTenantsList().map((tenantName) => {
    return {
      tenantName,
    }
  });
}

export default Tenants;
