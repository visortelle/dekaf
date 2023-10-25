import React from 'react';
import s from './Overview.module.css'
import st from '../../ui/SimpleTable/SimpleTable.module.css';
import stt from '../../ui/Tabs/Tabs.module.css';
import { swrKeys } from '../../swrKeys';
import Td from '../../ui/SimpleTable/Td';
import TooltipElement from "../../ui/Tooltip/TooltipElement/TooltipElement";
import * as GrpcClient from "../../app/contexts/GrpcClient/GrpcClient";
import useSWR from "swr";
import * as pbc from "../../../grpc-web/tools/teal/pulsar/ui/clusters/v1/clusters_pb";
import * as pbn from '../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb';
import { Code } from "../../../grpc-web/google/rpc/code_pb";
import * as Notifications from "../../app/contexts/Notifications";
import { TabContent } from "../../ui/Tabs/Tabs";
import NothingToShow from "../../ui/NothingToShow/NothingToShow";
import * as pbUtils from "../../../proto-utils/proto-utils";
import Table from "../../ui/Table/Table";
import * as Modals from "../../app/contexts/Modals/Modals";
import SplitBundle from "./SplitBundle/SplitBundle";
import ClearBacklogBundle from "./ClearBacklogBundle/ClearBacklogBundle";
import UnloadBundle from "./UnloadBundle/UnloadBundle";
import UnloadAll from "./UnloadAll/UnloadAll";
import ClearBacklog from "./ClearBacklog/ClearBacklog";
import SmallButton from '../../ui/SmallButton/SmallButton';
import KeyValueEditor, { recordToIndexedKv } from '../../ui/KeyValueEditor/KeyValueEditor';

export type BundleKey = string

type TopicCountDataEntry = {
  topicsCount: number,
  topicsCountExcludingPartitions: number,
  persistentTopicsCount: number,
  nonPersistentTopicsCount: number,
  properties: Record<string, string> | undefined,
}

export type OverviewProps = {
  tenant: string;
  namespace: string;
};

const Overview: React.FC<OverviewProps> = (props) => {
  const modals = Modals.useContext();
  const namespaceFqn = `${props.tenant}/${props.namespace}`;
  const { notifyError, notifySuccess } = Notifications.useContext();
  const { namespaceServiceClient } = GrpcClient.useContext();
  const { clustersServiceClient } = GrpcClient.useContext();
  const [activeTab, setActiveTab] = React.useState<string | undefined>();

  const { data: topicCounts, error: topicCountsError, isLoading: isTopicCountsLoading } = useSWR(
    swrKeys.pulsar.tenants.tenant.namespaces.namespace.statistics._({
      tenant: props.tenant,
      namespace: props.namespace
    }),
    async () => {
      const topicsCountReq = new pbn.GetTopicsCountRequest();
      topicsCountReq.setNamespacesList([namespaceFqn]);
      topicsCountReq.setIsIncludeSystemTopics(false);
      topicsCountReq.setIsIncludePersistedAndNonPersistedTopics(true);

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

      const persistentTopicsCountMap = topicsCountRes === undefined ?
        {} :
        pbUtils.mapToObject(topicsCountRes.getTopicsCountPersistedMap());

      const nonPersistentTopicsCountMap = topicsCountRes === undefined ?
        {} :
        pbUtils.mapToObject(topicsCountRes.getTopicsCountNonPersistedMap());

      const propertiesReq = new pbn.GetPropertiesRequest();
      propertiesReq.setNamespacesList([namespaceFqn]);
      const propertiesRes = await namespaceServiceClient.getProperties(propertiesReq, null)
        .catch((err) => notifyError(`Unable to get namespace properties. ${err}`));

      const propertiesPb = propertiesRes?.getPropertiesMap()?.get(namespaceFqn)?.getPropertiesMap();
      const properties = propertiesPb === undefined ? undefined : pbUtils.mapToObject(propertiesPb);

      const dataEntry: TopicCountDataEntry = {
        topicsCount: topicsCountMap[namespaceFqn],
        topicsCountExcludingPartitions: topicsCountExcludingPartitionsMap[namespaceFqn],
        persistentTopicsCount: persistentTopicsCountMap[namespaceFqn],
        nonPersistentTopicsCount: nonPersistentTopicsCountMap[namespaceFqn],
        properties
      };

      return dataEntry;
    }
  );

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
    })

  React.useEffect(() => {
    if (clusters && !clustersError) {
      setActiveTab(clusters.at(0));
    }
  }, [clusters, clustersError])

  return (
    <div className={s.Overview}>
      <div className={`${s.Section} ${s.StatisticsSection}`}>
        <table className={`${st.Table} ${s.Table}`}>
          <tbody>
            <tr className={st.Row}>
              <td className={st.HighlightedCell}>Namespace FQN</td>
              <Td>
                <div>{namespaceFqn}</div>
              </Td>
            </tr>
            <tr className={st.Row}>
              <td className={st.HighlightedCell}>Persistent topics count</td>
              <Td>
                {
                  isTopicCountsLoading ? (
                    <div className={s.LoadingPlaceholder} />
                  ) : (
                    <div>{topicCounts?.persistentTopicsCount}</div>
                  )
                }
              </Td>
            </tr>
            <tr className={st.Row}>
              <td className={st.HighlightedCell}>Non-persistent topics count</td>
              <Td>
                {
                  isTopicCountsLoading ? (
                    <div className={s.LoadingPlaceholder} />
                  ) : (
                    <div>{topicCounts?.nonPersistentTopicsCount}</div>
                  )
                }
              </Td>
            </tr>
            <tr className={st.Row}>
              <td className={st.HighlightedCell}>Topics count</td>
              <Td>
                {
                  isTopicCountsLoading ? (
                    <div className={s.LoadingPlaceholder} />
                  ) : (
                    <div>{topicCounts?.topicsCountExcludingPartitions}</div>
                  )
                }
              </Td>
            </tr>
            <tr className={st.Row}>
              <td className={st.HighlightedCell}>Topics count including partitions</td>
              <Td>
                {
                  isTopicCountsLoading ? (
                    <div className={s.LoadingPlaceholder} />
                  ) : (
                    <div>{topicCounts?.topicsCount}</div>
                  )
                }
              </Td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className={s.Properties}>
        <strong>Properties</strong>
        <KeyValueEditor
          value={recordToIndexedKv(topicCounts?.properties || {})}
          onChange={() => { }}
          height='240rem'
          mode='readonly'
        />
      </div>

      <div className={s.Section}>
        <div className={s.SectionTitle}>
          <TooltipElement
            tooltipHelp={"A virtual group of topics that belong to the same namespace. A namespace bundle is defined as a range between two 32-bit hashes, such as 0x00000000 and 0xffffffff."}
            link={"https://pulsar.apache.org/docs/3.0.x/administration-load-balance/#pulsar-load-manager-architecture"}>
            Bundles
          </TooltipElement>
        </div>
        {
          (!isClustersLoading && clusters) ? (
            <div className={stt.Tabs}>
              <div className={stt.TabsList}>
                {clusters.map(tabKey => {
                  return (
                    <div
                      key={tabKey}
                      className={`${stt.Tab} ${tabKey === activeTab ? stt.ActiveTab : ''}`}
                      onClick={() => setActiveTab(tabKey)}
                    >
                      <div>{tabKey}</div>
                    </div>
                  );
                })}
              </div>

              <div className={stt.TabContent}>
                {clusters.map(tabKey => {
                  return (
                    <TabContent key={tabKey} isShow={activeTab === tabKey} direction={'column'}>
                      <div className={s.BundleTableHeader}>
                        <div className={s.BundleTableHeaderLeft}>
                          <SmallButton
                            type="regular"
                            onClick={() => {
                              modals.push({
                                id: "unload-all-bundles",
                                title: `Unload all bundles`,
                                content: (
                                  <UnloadAll
                                    namespaceFqn={namespaceFqn}
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
                                  />
                                ),
                                styleMode: "no-content-padding",
                              });
                            }}
                            text="Clear backlog"
                          />
                        </div>
                        <div className={s.BundleTableHeaderRight}>
                        </div>
                      </div>

                      <div style={{ maxHeight: "600rem", minHeight: "300rem", display: 'flex' }}>
                        <Table<'bundle' | 'actions', BundleKey, {}>
                          itemNamePlural={'bundles'}
                          tableId={"bundle-overview-table"}
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

                    </TabContent>
                  );
                })}
              </div>
            </div>
          ) : (
            <NothingToShow reason={'no-items-found'} />
          )
        }
      </div>
    </div>
  );
}

export default Overview;
