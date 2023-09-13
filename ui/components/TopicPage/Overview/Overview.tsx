import React from 'react';
import s from './Overview.module.css'
import st from '../../ui/SimpleTable/SimpleTable.module.css';
import * as GrpcClient from '../../app/contexts/GrpcClient/GrpcClient';
import * as Notifications from '../../app/contexts/Notifications';
import * as I18n from '../../app/contexts/I18n/I18n';
import * as pb from '../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb';
import { swrKeys } from '../../swrKeys';
import useSwr from 'swr';
import { Code } from '../../../grpc-web/google/rpc/code_pb';
import NothingToShow from '../../ui/NothingToShow/NothingToShow';
import Tabs from '../../ui/Tabs/Tabs';
import Statistics from './Statistics/Statistics';
import Td from '../../ui/SimpleTable/Td';
import InternalStatistics from './InternalStatistics/InternalStatistics';
import JsonView from "../../ui/JsonView/JsonView";
import CopyField from "../../ui/CopyField/CopyField";

export type OverviewProps = {
  tenant: string;
  namespace: string;
  topic: string;
  topicType: "persistent" | "non-persistent";
};

type TabKey = 'stats' | 'stats-internal';

type Partitioning = 'partitioned' | 'non-partitioned' | 'partition';

const Overview: React.FC<OverviewProps> = (props) => {
  const { notifyError } = Notifications.useContext();
  const { topicServiceClient } = GrpcClient.useContext();
  const i18n = I18n.useContext();
  const [activeTab, setActiveTab] = React.useState<TabKey>('stats');

  const topicFqn = `${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`;

  const { data: statsResponse, error: statsError, isLoading: isStatsLoading } = useSwr(
    swrKeys.pulsar.customApi.metrics.topicsStats._([topicFqn]),
    async () => {
      const req = new pb.GetTopicsStatsRequest();

      req.setIsGetPreciseBacklog(true);
      req.setIsEarliestTimeInBacklog(true);
      req.setIsSubscriptionBacklogSize(true);
      req.setIsPerPartition(false);

      req.setTopicsList([topicFqn]);
      req.setPartitionedTopicsList([topicFqn]);

      const res = await topicServiceClient.getTopicsStats(req, null)
        .catch((err) => notifyError(`Unable to get topic properties. ${err}`));

      if (res === undefined) {
        return;
      }

      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get topic stats. ${res.getStatus()?.getMessage()}`);
        return;
      }

      return res;
    }
  );

  const { data: propertiesResponse, error: propertiesResponseError, isLoading: isPropertiesResponseLoading } = useSwr(
    swrKeys.pulsar.customApi.metrics.topicsProperties._([topicFqn]),
    async () => {
      const req = new pb.GetTopicPropertiesRequest();
      req.setTopicsList([topicFqn])

      const res = await topicServiceClient.getTopicProperties(req, null)
        .catch((err) => notifyError(`Unable to get topics properties: ${err}`));

      if (res === undefined) {
        return;
      }

      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get topics properties: ${res.getStatus()?.getMessage()}`);
        return;
      }

      return res;
    }
  )

  if (statsError !== undefined) {
    notifyError(`Unable to get topic stats. ${statsError}`);
  }

  if (statsResponse === undefined) {
    return (
      <div className={s.NothingToShow}>
        <NothingToShow reason={isStatsLoading ? 'loading-in-progress' : 'no-items-found'} />
      </div>
    );
  }

  let partitioning: Partitioning | undefined;
  if (statsResponse.getPartitionedTopicStatsMap().get(topicFqn)) {
    partitioning = 'partitioned';
  } else if (statsResponse.getTopicStatsMap().get(topicFqn)) {
    partitioning = topicFqn.match(/-partition-\d+$/) ? 'partition' : 'non-partitioned';
  }

  const partitionedTopicMetadata = statsResponse.getPartitionedTopicStatsMap().get(topicFqn)?.getMetadata();
  const partitionsCount = partitionedTopicMetadata?.getPartitions()?.getValue();
  let properties = propertiesResponse &&
    propertiesResponse.getTopicPropertiesMap().get(topicFqn) &&
    propertiesResponse.getTopicPropertiesMap().get(topicFqn)?.getPropertiesMap() ||
    new Map<string, string>

  return (
    <div className={s.Overview}>
      <div className={s.Section}>
        <table className={st.Table}>
          <tbody>
            <tr className={st.Row}>
              <td className={st.HighlightedCell}>Topic Name</td>
              <Td>
                <CopyField className={s.TopicNameCopyField} isShowTooltips={true} tooltip={<span />} value={props.topic} rawValue={props.topic} isTitleVisible={false} />
              </Td>
            </tr>
            <tr className={st.Row}>
              <td className={st.HighlightedCell}>Topic FQN</td>
              <Td>
                <CopyField isShowTooltips={true} tooltip={<span />} value={topicFqn} rawValue={topicFqn} isTitleVisible={false} />
              </Td>
            </tr>
            <tr className={st.Row}>
              <td className={st.HighlightedCell}>Persistency</td>
              <Td>{props.topicType}</Td>
            </tr>
            <tr className={st.Row}>
              <td className={st.HighlightedCell}>Partitioning</td>
              <Td>
                {partitioning}
                {partitionsCount === undefined ? undefined : <span> (<strong>{partitionsCount}</strong> partitions)</span>}
              </Td>
            </tr>
            {partitioning === 'partitioned' && (
              <tr>
                <td className={st.HighlightedCell}>Deleted</td>
                <Td>
                  {(() => {
                    const deleted = partitionedTopicMetadata?.getDeleted()?.getValue();
                    return <div>{deleted === undefined ? undefined : i18n.formatBoolean(deleted)}</div>
                  })()}
                </Td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={s.Properties}>
        <strong>Properties</strong>
        <div className={s.JsonViewer}>
          <JsonView
            value={Object.fromEntries(properties.entries())}
            height={'110rem'}
            width={'100%'}
          />
        </div>
      </div>

      <div className={s.Section}>
        <div className={s.Tabs}>
          <Tabs<TabKey>
            activeTab={activeTab}
            onActiveTabChange={setActiveTab}
            tabs={{
              'stats': {
                title: 'Statistics',
                render: () => (
                  <div className={s.Tab}>
                    <Statistics
                      tenant={props.tenant}
                      namespace={props.namespace}
                      topic={props.topic}
                      topicType={props.topicType}
                      topicsStatsRes={statsResponse}
                    />
                  </div>
                )
              },
              'stats-internal': {
                title: 'Internal Statistics',
                render: () => (
                  <div className={s.Tab}>
                    <InternalStatistics
                      tenant={props.tenant}
                      namespace={props.namespace}
                      topic={props.topic}
                      topicType={props.topicType}
                    />
                  </div>
                )
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default Overview;
