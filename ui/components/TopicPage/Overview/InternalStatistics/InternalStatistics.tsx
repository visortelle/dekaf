import React from 'react';
import s from './InternalStatistics.module.css'
import { swrKeys } from '../../../swrKeys';
import useSWR from 'swr';
import * as GrpcClient from '../../../app/contexts/GrpcClient/GrpcClient';
import * as Notifications from '../../../app/contexts/Notifications';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import NothingToShow from '../../../ui/NothingToShow/NothingToShow';
import PersistentTopicInternalStats from './PersistentTopicInternalStats/PersistentTopicInternalStats';
import PartitionedTopicInternalStats from './PartitionedTopicInternalStats/PartitionedTopicInternalStats';
import { PulsarTopicPersistency } from '../../../pulsar/pulsar-resources';

export type InternalStatisticsProps = {
  tenant: string;
  namespace: string;
  topic: string;
  topicPersistency: PulsarTopicPersistency;
};

const InternalStatistics: React.FC<InternalStatisticsProps> = (props) => {
  const { topicServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();

  const topicFqn = `${props.topicPersistency}://${props.tenant}/${props.namespace}/${props.topic}`;

  const { data: topicsInternalStats, error: topicsInternalStatsError, isLoading } = useSWR(
    swrKeys.pulsar.customApi.metrics.topicsInternalStats._([topicFqn]),
    async () => {
      const req = new pb.GetTopicsInternalStatsRequest();
      req.setTopicsList([topicFqn]);
      const res = await topicServiceClient.getTopicsInternalStats(req, {})
        .catch((err) => notifyError(`Unable to get topics internal stats. ${err}`));

      if (res === undefined) {
        return;
      }

      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get topics internal stats. ${res.getStatus()?.getMessage()}`);
        return;
      }

      return res;
    },
    { refreshInterval: 5000 }
  );

  if (topicsInternalStats === undefined) {
    return (
      <div className={s.NothingToShow}>
        <NothingToShow reason={isLoading ? 'loading-in-progress' : 'no-items-found'} />
      </div>
    );
  }

  if (topicsInternalStatsError) {
    notifyError(`Unable to get topics internal stats. ${topicsInternalStatsError}`);
  }

  const nonPartitionedTopicStats = topicsInternalStats?.getStatsMap().get(topicFqn)?.getTopicStats();
  const partitionedTopicStats = topicsInternalStats?.getStatsMap().get(topicFqn)?.getPartitionedTopicStats();

  return (
    <div className={s.InternalStatistics}>
      {nonPartitionedTopicStats && (
        <PersistentTopicInternalStats
          stats={nonPartitionedTopicStats}
          tenant={props.tenant}
          namespace={props.namespace}
          topic={props.topic}
          topicPersistency={props.topicPersistency}
        />
      )}
      {partitionedTopicStats && (
        <PartitionedTopicInternalStats
          stats={partitionedTopicStats}
          tenant={props.tenant}
          namespace={props.namespace}
          topic={props.topic}
          topicPersistency={props.topicPersistency}
        />
      )}
    </div>
  );
}



export default InternalStatistics;
