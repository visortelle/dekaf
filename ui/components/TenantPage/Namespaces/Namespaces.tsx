import React from 'react';
import s from './Namespaces.module.css'
import * as GrpcClient from '../../app/contexts/GrpcClient/GrpcClient';
import * as Notifications from '../../app/contexts/Notifications';
import * as I18n from '../../app/contexts/I18n/I18n';
import * as pb from '../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb';
import Table from '../../ui/Table/Table';
import { help } from './help';
import { Code } from '../../../grpc-web/google/rpc/code_pb';
import Link from '../../ui/Link/Link';
import { routes } from '../../routes';
import * as pbUtils from '../../../pbUtils/pbUtils';

export type ColumnKey =
  'namespaceName' |
  'topicsCount' |
  'topicsCountIncludingPartitions' |
  'properties';

export type DataEntry = {
  namespaceName: string;
}

export type LazyDataEntry = {
  topicsCount?: number;
  topicsCountExcludingPartitions?: number;
  properties?: Record<string, string>;
};

export type NamespacesProps = {
  tenant: string;
};
const Namespaces: React.FC<NamespacesProps> = (props) => {
  const { namespaceServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const i18n = I18n.useContext();

  const dataLoaderCacheKey = [`namespaces-table-${props.tenant}`];
  const dataLoader = async () => {
    const req = new pb.ListNamespacesRequest();
    req.setTenant(props.tenant);

    const res = await namespaceServiceClient.listNamespaces(req, null)
      .catch((err) => notifyError(`Unable to list tenants. ${err}`));

    if (res === undefined) {
      return [];
    }

    return dataEntriesFromPb(res);
  }

  return (
    <div className={s.Page}>
      <Table<ColumnKey, DataEntry, LazyDataEntry>
        itemNamePlural='namespaces'
        columns={{
          help,
          columns: {
            namespaceName: {
              title: 'Name',
              render: (de) => i18n.withVoidDefault(de.namespaceName, v => (
                <Link to={`${routes.tenants.tenant.namespaces.namespace.overview._.get({ tenant: props.tenant, namespace: de.namespaceName })}`}>
                  {v}
                </Link>
              )),
              sortFn: (a, b) => (a.data.namespaceName || '').localeCompare(b.data.namespaceName || '', 'en', { numeric: true }),
              filter: {
                descriptor: {
                  type: 'string',
                  defaultValue: { type: 'string', value: '' }
                },
                testFn: (de, _, filterValue) => {
                  if (filterValue.type !== 'string') {
                    return true
                  };

                  return de.namespaceName.toLowerCase().includes(filterValue.value.toLowerCase());
                },
              }
            },
            topicsCount: {
              title: 'Topics',
              isLazy: true,
              render: (_, ld) => i18n.withVoidDefault(ld?.topicsCountExcludingPartitions, v => (
                <Link to={`${routes.tenants.tenant.namespaces.namespace.topics._.get({ tenant: props.tenant, namespace: _.namespaceName })}`}>
                  {v}
                </Link>
              )),
            },
            topicsCountIncludingPartitions: {
              title: 'Topics Including Partitions',
              isLazy: true,
              render: (_, ld) => i18n.withVoidDefault(ld?.topicsCount, v => (
                <Link to={`${routes.tenants.tenant.namespaces.namespace.topics._.get({ tenant: props.tenant, namespace: _.namespaceName })}`}>
                  {v}
                </Link>
              )),
            },
            properties: {
              title: 'Properties',
              isLazy: true,
              render: (_, ld) => i18n.withVoidDefault(ld?.properties, v => JSON.stringify(v, null, 4)),
            }
          },
          defaultConfig: [
            { columnKey: 'namespaceName', width: 300, visibility: 'visible', stickyTo: 'left' },
            { columnKey: 'topicsCount', width: 100, visibility: 'visible' },
            { columnKey: 'topicsCountIncludingPartitions', width: 100, visibility: 'visible' },
            { columnKey: 'properties', width: 400, visibility: 'visible' },
          ],
        }}
        dataLoader={{
          cacheKey: dataLoaderCacheKey,
          loader: dataLoader
        }}
        lazyDataLoader={{
          loader: async (des) => {
            const topicsCountReq = new pb.GetTopicsCountRequest();
            topicsCountReq.setNamespacesList(des.map(d => `${props.tenant}/${d.namespaceName}`));
            topicsCountReq.setIsIncludeSystemTopics(false);

            const topicsCountRes = await namespaceServiceClient.getTopicsCount(topicsCountReq, null)
              .catch((err) => notifyError(`Unable to get topics count. ${err}`));

            if (topicsCountRes?.getStatus()?.getCode() !== Code.OK) {
              notifyError(`Unable to get topics count. ${topicsCountRes?.getStatus()?.getMessage()}`);
            }

            const topicsCountMap = topicsCountRes === undefined ?
              {} :
              pbUtils.mapToObject(topicsCountRes.getTopicsCountMap());
            const topicsCountExcludingPartitionsMap = topicsCountRes === undefined ?
              {} :
              pbUtils.mapToObject(topicsCountRes.getTopicsCountExcludingPartitionsMap());

            const propertiesReq = new pb.GetPropertiesRequest();
            propertiesReq.setNamespacesList(des.map(d => `${props.tenant}/${d.namespaceName}`));
            const propertiesRes = await namespaceServiceClient.getProperties(propertiesReq, null)
              .catch((err) => notifyError(`Unable to get namespace properties. ${err}`));

            const lazyData: Record<string, LazyDataEntry> = des.reduce((acc, de) => {
              const namespaceFqn = `${props.tenant}/${de.namespaceName}`;
              const propertiesPb = propertiesRes?.getPropertiesMap()?.get(namespaceFqn)?.getPropertiesMap();
              const properties = propertiesPb === undefined ? undefined : pbUtils.mapToObject(propertiesPb);

              const ld: LazyDataEntry = {
                topicsCount: topicsCountMap[namespaceFqn],
                topicsCountExcludingPartitions: topicsCountExcludingPartitionsMap[namespaceFqn],
                properties
              };
              return { ...acc, [de.namespaceName]: ld };
            }, {});

            return lazyData;
          }
        }}
        autoRefresh={{
          intervalMs: 5000
        }}
        getId={(entry) => entry.namespaceName ?? ''}
        tableId='namespaces-table'
        defaultSort={{ column: 'namespaceName', direction: 'asc', type: 'by-single-column' }}
        defaultFiltersInUse={{
          'namespaceName': {
            state: 'active',
            value: { 'type': 'string', value: '' }
          },
        }}
      />
    </div>
  );
}

function dataEntriesFromPb(res: pb.ListNamespacesResponse): DataEntry[] {
  return res.getNamespacesList().map((ns) => {
    const [_, namespaceName] = ns.split('/');
    return { namespaceName };
  });
}

export default Namespaces;
