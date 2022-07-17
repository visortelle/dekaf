import React, { useMemo } from 'react';
import s from './TopicsSubscriptionsCursors.module.css'
import * as PulsarGrpcClient from '../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient'
import * as Notifications from '../../../app/contexts/Notifications'
import { swrKeys } from '../../../swrKeys';
import useSWR from 'swr';
import { CursorStats, GetTopicsInternalStatsRequest, ManagedLedgerInternalStats, TopicInternalStats } from '../../../../grpc-web/tools/teal/pulsar/ui/api/v1/topic_pb';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';

type TopicName = string;
type PartitionName = string;
type SubscriptionName = string;
type Subscriptions = SubscriptionName[];
type CursorSelector = Record<TopicName, Subscriptions>;

type TopicCursorStats =
  { topicType: 'non-partitioned', topic: TopicName, subscriptions: SubscriptionsCursorStats } |
  { topicType: 'partitioned', topic: TopicName, partitions: Record<PartitionName, { subscriptions: SubscriptionsCursorStats }> } |
  { topicType: 'not-found', topic: TopicName };
type SubscriptionsCursorStats = Record<SubscriptionName, CursorStats>

export type TopicsSubscriptionsCursorsProps = {
  selector: CursorSelector
};

const TopicsSubscriptionsCursors: React.FC<TopicsSubscriptionsCursorsProps> = (props) => {
  const { topicServiceClient } = PulsarGrpcClient.useContext();
  const { notifyError } = Notifications.useContext();

  const topics = useMemo(() => Object.keys(props.selector), [props.selector]);

  const { data: topicsInternalStats, error: topicsInternalStatsError } = useSWR(
    swrKeys.pulsar.customApi.metrics.topicsInternalStats._(topics),
    async () => {
      const req = new GetTopicsInternalStatsRequest();
      req.setTopicsList(topics);
      return await topicServiceClient.getTopicsInternalStats(req, {});
    },
    { refreshInterval: 500 }
  );

  if (topicsInternalStatsError || (topicsInternalStats && topicsInternalStats?.getStatus()?.getCode() !== Code.OK)) {
    notifyError(`Unable to get topics internal stats. ${topicsInternalStatsError}`);
  }

  const statsMapPb = topicsInternalStats?.getStatsMap();

  function getSubscriptions(stats: ManagedLedgerInternalStats, topicName: string): Record<SubscriptionName, CursorStats> {
    let topicCursors: Record<string, CursorStats> = {};
    stats.getCursorsMap().forEach((cursorStats, subscriptionName) => {
      const subscriptions = props.selector[topicName] || [];
      topicCursors = subscriptions.includes(subscriptionName) ? { ...topicCursors, [subscriptionName]: cursorStats } : topicCursors;
    });
    return topicCursors;
  }

  const cursors: TopicCursorStats[] = topics.map(topic => {
    const topicStats = statsMapPb?.get(topic);
    if (topicStats === undefined) {
      return { topicType: 'not-found', topic };
    }

    switch (topicStats?.getStatsCase()) {
      case TopicInternalStats.StatsCase.TOPIC_STATS: {
        const managedLedgerInternalStats = topicStats.getTopicStats()?.getManagedLedgerInternalStats();
        if (managedLedgerInternalStats === undefined) {
          const topicCursorStats: TopicCursorStats = { topicType: 'not-found', topic };
          return topicCursorStats;
        }
        const topicCursorStats: TopicCursorStats = { topicType: 'non-partitioned', topic, subscriptions: getSubscriptions(managedLedgerInternalStats, topic) };
        return topicCursorStats;
      };

      case TopicInternalStats.StatsCase.PARTITIONED_TOPIC_STATS: {
        const partitionedTopicStats = topicStats.getPartitionedTopicStats();
        let partitions = {};
        partitionedTopicStats?.getPartitionsMap()?.forEach((partition, partitionName) => {
          const managedLedgerInternalStats = partition.getManagedLedgerInternalStats();
          if (managedLedgerInternalStats === undefined) {
            return;
          }
          partitions = { ...partitions, [partitionName]: { subscriptions: getSubscriptions(managedLedgerInternalStats, topic) } };
        });
        const topicCursorStats: TopicCursorStats = { topicType: 'partitioned', topic, partitions };
        return topicCursorStats;
      };

      default: {
        const topicCursorStats: TopicCursorStats = { topicType: 'not-found', topic };
        return topicCursorStats;
      };
    };
  });

  console.log('cursors', cursors);
  // return (
  //   <div key={topic} className={s.Topic}>
  //     <div className={s.TopicName}>{topic}</div>
  //     <div className={s.TopicCursors}>
  //     </div>
  //   </div>
  // );

  return (
    <div className={s.TopicsSubscriptionsCursors}>
      { }
    </div>
  );
}

export default TopicsSubscriptionsCursors;
