import React from 'react';
import s from './Overview.module.css'
import * as GrpcClient from '../../app/contexts/GrpcClient/GrpcClient';
import * as Notifications from '../../app/contexts/Notifications';
import * as I18n from '../../app/contexts/I18n/I18n';
import * as pb from '../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb';
import { swrKeys } from '../../swrKeys';
import useSwr from 'swr';
import { H1, H2 } from '../../ui/H/H';
import * as st from '../../ui/SimpleTable/SimpleTable.module.css';
import * as pbUtils from '../../../pbUtils/pbUtils';
import { Code } from '../../../grpc-web/google/rpc/code_pb';
import NothingToShow from '../../ui/NothingToShow/NothingToShow';
import Link from '../../ui/Link/Link';
import NoData from '../../ui/NoData/NoData';
import { routes } from '../../routes';
import Tabs, { Tab } from '../../ui/Tabs/Tabs';
import Statistics from './Statistics/Statistics';
import Td from '../../ui/SimpleTable/Td';
import InternalStatistics from './InternalStatistics/InternalStatistics';

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

  const { data: statsData, error: statsDataError } = useSwr(
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
        .catch((err) => notifyError(`Unable to get topic stats. ${err}`));

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

  if (statsDataError !== undefined) {
    notifyError(`Unable to get topic stats. ${statsDataError}`);
  }

  if (statsData === undefined) {
    return (
      <div className={s.NothingToShow}>
        <NothingToShow />
      </div>
    );
  }

  let partitioning: Partitioning | undefined;
  if (statsData.getPartitionedTopicStatsMap().get(topicFqn)) {
    partitioning = 'partitioned';
  } else if (statsData.getTopicStatsMap().get(topicFqn)) {
    partitioning = topicFqn.match(/-partition-\d+$/) ? 'partition' : 'non-partitioned';
  }

  const partitionedTopicMetadata = statsData.getPartitionedTopicStatsMap().get(topicFqn)?.getMetadata();
  const partitionsCount = partitionedTopicMetadata?.getPartitions()?.getValue();

  return (
    <div className={s.Overview}>
      <div className={s.LeftPanel}>
        <div className={s.Title}>
          <H1>Topic Overview</H1>
        </div>

        <div className={s.Section}>
          <table className={st.Table}>
            <tbody>
              <tr className={st.Row}>
                <td className={st.HighlightedCell}>Topic Name</td>
                <Td>{props.topic}</Td>
              </tr>
              <tr className={st.Row}>
                <td className={st.HighlightedCell}>Topic FQN</td>
                <Td>{topicFqn}</Td>
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
                        topicsStatsRes={statsData}
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

      <div className={s.RightPanel}>
        <iframe src="https://grafana.wikimedia.org/d-solo/O_OXJyTVk/home-w-wiki-status?orgId=1&refresh=30s&from=1687442246712&to=1687528646712&theme=light&panelId=8" width="100%" height="200" frameBorder="0"></iframe>
      </div>
    </div>
  );
}

export default Overview;
