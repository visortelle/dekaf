import React from 'react';
import s from './Overview.module.css'
import st from '../../ui/SimpleTable/SimpleTable.module.css';
import { swrKeys } from '../../swrKeys';
import Td from '../../ui/SimpleTable/Td';
import * as GrpcClient from "../../app/contexts/GrpcClient/GrpcClient";
import useSWR from "swr";
import * as pbn from '../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb';
import { Code } from "../../../grpc-web/google/rpc/code_pb";
import * as Notifications from "../../app/contexts/Notifications";
import * as pbUtils from "../../../proto-utils/proto-utils";
import { LibraryContext } from '../../ui/LibraryBrowser/model/library-context';
import LibrarySidebar from '../../ui/LibrarySidebar/LibrarySidebar';
import { NamespacePropertiesEditor } from './NamespacePropertiesEditor/NamespacePropertiesEditor';

type TopicCountDataEntry = {
  topicCount: number,
  topicCountExcludingPartitions: number,
  persistentTopicCount: number,
  nonPersistentTopicCount: number,
  properties: Record<string, string> | undefined,
}

export type OverviewProps = {
  tenant: string;
  namespace: string;
  libraryContext: LibraryContext;
};

const Overview: React.FC<OverviewProps> = (props) => {
  const namespaceFqn = `${props.tenant}/${props.namespace}`;
  const { notifyError } = Notifications.useContext();
  const { namespaceServiceClient } = GrpcClient.useContext();
  const { data: topicCounts, error: topicCountsError, isLoading: isTopicCountsLoading } = useSWR(
    swrKeys.pulsar.tenants.tenant.namespaces.namespace.statistics._({
      tenant: props.tenant,
      namespace: props.namespace
    }),
    async () => {
      const topicCountReq = new pbn.GetTopicsCountRequest();
      topicCountReq.setNamespacesList([namespaceFqn]);
      topicCountReq.setIsIncludeSystemTopics(true);

      const topicCountRes = await namespaceServiceClient.getTopicsCount(topicCountReq, null)
        .catch((err) => notifyError(`Unable to get topics count. ${err}`));

      if (topicCountRes?.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get topics count. ${topicCountRes?.getStatus()?.getMessage()}`);
      }

      const topicCountMap = topicCountRes === undefined ?
        {} :
        pbUtils.mapToObject(topicCountRes.getTopicCountMap());

      const topicCountExcludingPartitionsMap = topicCountRes === undefined ?
        {} :
        pbUtils.mapToObject(topicCountRes.getTopicCountExcludingPartitionsMap());

      const persistentTopicCountMap = topicCountRes === undefined ?
        {} :
        pbUtils.mapToObject(topicCountRes.getTopicCountPersistentMap());

      const nonPersistentTopicCountMap = topicCountRes === undefined ?
        {} :
        pbUtils.mapToObject(topicCountRes.getTopicCountNonPersistentMap());

      const propertiesReq = new pbn.GetPropertiesRequest();
      propertiesReq.setNamespacesList([namespaceFqn]);
      const propertiesRes = await namespaceServiceClient.getProperties(propertiesReq, null)
        .catch((err) => notifyError(`Unable to get namespace properties. ${err}`));

      const propertiesPb = propertiesRes?.getPropertiesMap()?.get(namespaceFqn)?.getPropertiesMap();
      const properties = propertiesPb === undefined ? undefined : pbUtils.mapToObject(propertiesPb);

      const dataEntry: TopicCountDataEntry = {
        topicCount: topicCountMap[namespaceFqn],
        topicCountExcludingPartitions: topicCountExcludingPartitionsMap[namespaceFqn],
        persistentTopicCount: persistentTopicCountMap[namespaceFqn],
        nonPersistentTopicCount: nonPersistentTopicCountMap[namespaceFqn],
        properties
      };

      return dataEntry;
    }
  );

  return (
    <div className={s.Overview}>
      <div className={s.LeftPanel}>
        <div className={`${s.Section} ${s.StatisticsSection}`}>
          <table className={`${st.Table} ${s.Table}`} style={{ width: '100%' }}>
            <tbody>
              <tr className={st.Row}>
                <td className={st.HighlightedCell} style={{ width: '240rem' }}>Namespace FQN</td>
                <Td>
                  <div>{namespaceFqn}</div>
                </Td>
              </tr>
              <tr className={st.Row}>
                <td className={st.HighlightedCell}>Topics count</td>
                <Td>
                  {
                    isTopicCountsLoading ? (
                      <div className={s.LoadingPlaceholder} />
                    ) : (
                      <div>{topicCounts?.topicCountExcludingPartitions}</div>
                    )
                  }
                </Td>
              </tr>
              <tr className={st.Row}>
                <td className={st.HighlightedCell}>Including active partitions</td>
                <Td>
                  {
                    isTopicCountsLoading ? (
                      <div className={s.LoadingPlaceholder} />
                    ) : (
                      <div>{topicCounts?.topicCount}</div>
                    )
                  }
                </Td>
              </tr>
              <tr className={st.Row}>
                <td className={st.HighlightedCell}>Persistent topics count</td>
                <Td>
                  {
                    isTopicCountsLoading ? (
                      <div className={s.LoadingPlaceholder} />
                    ) : (
                      <div>{topicCounts?.persistentTopicCount}</div>
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
                      <div>{topicCounts?.nonPersistentTopicCount}</div>
                    )
                  }
                </Td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className={s.Properties}>
          <NamespacePropertiesEditor
            tenant={props.tenant}
            namespace={props.namespace}
          />
        </div>
      </div>
      <div className={s.RightPanel}>
        <LibrarySidebar
          libraryContext={props.libraryContext}
        />
      </div>
    </div>
  );
}

export default Overview;
