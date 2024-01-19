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
import { PulsarTopicPersistency } from '../../pulsar/pulsar-resources';
import LibrarySidebar from '../../ui/LibrarySidebar/LibrarySidebar';
import { LibraryContext } from '../../ui/LibraryBrowser/model/library-context';
import TopicMetadataEditor from './TopicPropertiesEditor/TopicPropertiesEditor';

export type OverviewProps = {
  tenant: string;
  namespace: string;
  topic: string;
  topicPersistency: PulsarTopicPersistency;
  libraryContext: LibraryContext;
};

type TabKey = 'stats' | 'stats-internal';

type Partitioning = 'partitioned' | 'non-partitioned' | 'partition';

const Overview: React.FC<OverviewProps> = (props) => {
  const { notifyError } = Notifications.useContext();
  const { topicServiceClient } = GrpcClient.useContext();
  const i18n = I18n.useContext();
  const [activeTab, setActiveTab] = React.useState<TabKey>('stats');

  const topicFqn = `${props.topicPersistency}://${props.tenant}/${props.namespace}/${props.topic}`;

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

  return (
    <div className={s.Overview}>
      <div className={s.LeftPanel}>
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
                <Td>{props.topicPersistency}</Td>
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

        {(props.topicPersistency !== 'non-persistent') && (partitioning === 'partitioned' || partitioning === 'non-partitioned') && (
          <div style={{ marginBottom: '24rem' }}>
            <TopicMetadataEditor
              tenant={props.tenant}
              namespace={props.namespace}
              topic={props.topic}
              persistency={props.topicPersistency}
            />
          </div>
        )}

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
                        topicPersistency={props.topicPersistency}
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
                        topicPersistency={props.topicPersistency}
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
        <LibrarySidebar libraryContext={props.libraryContext} />
      </div>
    </div>
  );
}

export default Overview;
