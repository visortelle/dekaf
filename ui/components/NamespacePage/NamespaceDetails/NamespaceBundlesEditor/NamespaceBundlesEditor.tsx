import React from 'react';
import s from './NamespaceBundlesEditor.module.css'
import * as pbc from "../../../../grpc-web/tools/teal/pulsar/ui/clusters/v1/clusters_pb";
import * as pbn from '../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb';
import Tabs from "../../../ui/Tabs/Tabs";
import Table from "../../../ui/Table/Table";
import * as Modals from "../../../app/contexts/Modals/Modals";
import SplitBundle from "./SplitBundle/SplitBundle";
import ClearBacklogBundle from "./ClearBacklogBundle/ClearBacklogBundle";
import UnloadBundle from "./UnloadBundle/UnloadBundle";
import UnloadAll from "./UnloadAll/UnloadAll";
import ClearBacklog from "./ClearBacklog/ClearBacklog";
import SmallButton from '../../../ui/SmallButton/SmallButton';
import * as Notifications from "../../../app/contexts/Notifications";
import * as GrpcClient from "../../../app/contexts/GrpcClient/GrpcClient";
import useSWR, { mutate } from 'swr';
import { swrKeys } from '../../../swrKeys';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import A from '../../../ui/A/A';

export type BundleKey = string

export type NamespaceBundlesEditorProps = {
  tenant: string,
  namespace: string
};

const NamespaceBundlesEditor: React.FC<NamespaceBundlesEditorProps> = (props) => {
  const modals = Modals.useContext();
  const namespaceFqn = `${props.tenant}/${props.namespace}`;
  const { notifyError } = Notifications.useContext();
  const { namespaceServiceClient, clustersServiceClient } = GrpcClient.useContext();
  const [activeTab, setActiveTab] = React.useState<string | undefined>();

  const { data: clusters, error: clustersError, isLoading: isClustersLoading } = useSWR(
    swrKeys.pulsar.clusters._(),
    async () => {
      const res = await clustersServiceClient.getClusters(
        new pbc.GetClustersRequest(),
        null
      );

      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(
          `Unable to get clusters list. ${res.getStatus()?.getMessage()}`
        );
        return [];
      }

      return res.getClustersList();
    }
  );

  const dataLoaderCacheKey =
    swrKeys.pulsar.tenants.tenant.namespaces.namespace.bundles._({
      tenant: props.tenant,
      namespace: props.namespace
    });

  React.useEffect(() => {
    if (clusters && !clustersError) {
      setActiveTab(clusters.at(0));
    }
  }, [clusters, clustersError]);

  if (activeTab === undefined) {
    return <>Loading...</>;
  }

  const reloadData = () => {
    mutate(dataLoaderCacheKey);
  }

  return (
    <div className={s.NamespaceBundlesEditor}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12rem' }}>
        <div className={s.SectionTitle}>
          <div>
            A bundle is a virtual group of topics that belongs to the same namespace and is used for load balancing.
          </div>
          <A href="https://pulsar.apache.org/docs/next/administration-load-balance" isExternalLink>Learn more</A>
        </div>
        <div style={{ display: 'grid', gap: '12rem', gridTemplateColumns: '1fr 1fr', width: '320rem' }}>
          <SmallButton
            type="regular"
            onClick={() => {
              modals.push({
                id: "unload-all-bundles",
                title: `Unload all bundles`,
                content: (
                  <UnloadAll
                    namespaceFqn={namespaceFqn}
                    onUnload={reloadData}
                  />
                ),
                styleMode: "no-content-padding",
              });
            }}
            text="Unload all"
          />
          <SmallButton
            type="danger"
            onClick={() => {
              modals.push({
                id: "clear-backlog",
                title: `Clear backlog`,
                content: (
                  <ClearBacklog
                    namespaceFqn={namespaceFqn}
                    onClear={reloadData}
                  />
                ),
                styleMode: "no-content-padding",
              });
            }}
            text="Clear backlog"
          />
        </div>
        {
          (!isClustersLoading && clusters) && (
            <Tabs
              activeTab={activeTab}
              onActiveTabChange={setActiveTab}
              size='small'
              tabs={clusters.map(cluster => ({
                key: cluster,
                title: cluster,
                render: () => {
                  return (
                    <div style={{ height: '480rem', display: 'flex' }}>
                      <Table<'bundle' | 'actions', BundleKey, {}>
                        itemNamePlural={'bundles'}
                        tableId={`bundles-${props.tenant}-${props.namespace}-${cluster}`}
                        dataLoader={{
                          cacheKey: dataLoaderCacheKey,
                          loader: async () => {
                            const req = new pbn.GetBundlesRequest();
                            req.setNamespace(namespaceFqn);

                            const res = await namespaceServiceClient.getBundles(req, null);
                            const bundles = res.getBundlesList().map(v => v as BundleKey);

                            return bundles
                          }
                        }}
                        columns={{
                          columns: {
                            bundle: {
                              title: 'Bundle',
                              render: (bundleKey) =>
                                <div className={s.BundleCell}>{bundleKey}</div>
                            },
                            actions: {
                              title: 'Actions',
                              render: (bundleKey: BundleKey) =>
                                <div className={s.ActionsCell}>
                                  <SmallButton
                                    type="regular"
                                    onClick={() => {
                                      modals.push({
                                        id: "split-bundle",
                                        title: `Split bundle`,
                                        content: (
                                          <SplitBundle
                                            namespaceFqn={namespaceFqn}
                                            bundleKey={bundleKey}
                                            onSplit={reloadData}
                                          />
                                        ),
                                        styleMode: "no-content-padding",
                                      });
                                    }}
                                    text="Split"
                                  />
                                  <SmallButton
                                    type="regular"
                                    onClick={() => {
                                      modals.push({
                                        id: "unload-bundle",
                                        title: `Unload bundle`,
                                        content: (
                                          <UnloadBundle
                                            namespaceFqn={namespaceFqn}
                                            bundleKey={bundleKey}
                                            onUnload={reloadData}
                                          />
                                        ),
                                        styleMode: "no-content-padding",
                                      });
                                    }}
                                    text="Unload"
                                  />
                                  <SmallButton
                                    type="danger"
                                    onClick={() => {
                                      modals.push({
                                        id: "clear-backlog-bundle",
                                        title: `Clear bundle backlog`,
                                        content: (
                                          <ClearBacklogBundle
                                            namespaceFqn={namespaceFqn}
                                            bundleKey={bundleKey}
                                            onClear={reloadData}
                                          />
                                        ),
                                        styleMode: "no-content-padding",
                                      });
                                    }}
                                    text="Clear backlog"
                                  />
                                </div>
                            }
                          },
                          defaultConfig: [
                            { columnKey: 'bundle', visibility: 'visible', stickyTo: 'left', width: 300 },
                            { columnKey: 'actions', visibility: 'visible', width: 300 },
                          ],
                        }}
                        getId={d => d}
                        autoRefresh={{ intervalMs: 5000 }}
                      />
                    </div>
                  )
                }
              }))}
            />
          )
        }
      </div>
    </div>
  )
}

export default NamespaceBundlesEditor;
