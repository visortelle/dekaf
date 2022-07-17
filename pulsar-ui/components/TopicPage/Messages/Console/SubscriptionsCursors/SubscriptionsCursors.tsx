import React, { useEffect, useMemo, useState } from 'react';
import s from './SubscriptionsCursors.module.css'
import * as PulsarGrpcClient from '../../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient'
import * as Notifications from '../../../../app/contexts/Notifications'
import { swrKeys } from '../../../../swrKeys';
import useSWR from 'swr';
import { CursorStats, GetTopicsInternalStatsRequest, ManagedLedgerInternalStats, TopicInternalStats } from '../../../../../grpc-web/tools/teal/pulsar/ui/api/v1/topic_pb';
import { Code } from '../../../../../grpc-web/google/rpc/code_pb';
import SubscriptionCursor, { SubscriptionCursorProps } from './SubscriptionCursor/SubscriptionCursor';

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

export type SubscriptionsCursorsProps = {
  selector: CursorSelector;
  isGetInitialCursorPositions: boolean; // Intended to correctly display current session range bar.
  onGetInitialCursorPositions: () => void;
};

const SubscriptionsCursors: React.FC<SubscriptionsCursorsProps> = (props) => {
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
    { refreshInterval: props.isGetInitialCursorPositions ? 200 : 1000 }
  );

  if (topicsInternalStatsError || (topicsInternalStats && topicsInternalStats?.getStatus()?.getCode() !== Code.OK)) {
    notifyError(`Unable to get topics internal stats. ${topicsInternalStatsError}`);
  }

  useEffect(() => {
    if (!props.isGetInitialCursorPositions && topicsInternalStats !== undefined) {
      const gotInitialCursorsPositions = topicsInternalStats.toObject().statsMap.some(sm => {
        const a = (sm[1].topicStats?.managedLedgerInternalStats?.cursorsMap?.length || 0) > 0;
        const b = (sm[1].partitionedTopicStats?.partitionsMap.some(p => (p[1].managedLedgerInternalStats?.cursorsMap?.length || 0) > 0))
        return a || b;
      });
      if (gotInitialCursorsPositions) {
        props.onGetInitialCursorPositions();
      }
    }
  }, [topicsInternalStats, props.isGetInitialCursorPositions]);

  const statsMapPb = topicsInternalStats?.getStatsMap();

  function getSubscriptions(stats: ManagedLedgerInternalStats, topicName: string): Record<SubscriptionName, CursorStats> {
    let topicCursors: Record<string, CursorStats> = {};
    stats.getCursorsMap().forEach((cursorStats, subscriptionName) => {
      const subscriptions = props.selector[topicName] || [];
      topicCursors = subscriptions.includes(subscriptionName) ? { ...topicCursors, [subscriptionName]: cursorStats } : topicCursors;
    });
    return topicCursors;
  }

  const topicsCursorStats: TopicCursorStats[] = topics.map(topic => {
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

  return (
    <div className={s.SubscriptionsCursors}>
      {topicsCursorStats.map(topicCursorStats => {
        if (topicCursorStats.topicType === 'non-partitioned') {
          const managedLedger = topicsInternalStats?.getStatsMap()?.get(topicCursorStats.topic)?.getTopicStats()?.getManagedLedgerInternalStats();
          if (managedLedger === undefined) {
            return <></>;
          }

          return (
            <div key={topicCursorStats.topic}>
              <div className={s.TopicName}>
                <strong>Topic: </strong>
                {topicCursorStats.topic}
              </div>
              <div className={s.TopicCursors}>
                {Object.keys(topicCursorStats.subscriptions).length === 0 && (<div className={s.NoSubscriptions}>-</div>)}
                {Object.keys(topicCursorStats.subscriptions).map(subscriptionName => {
                  const cursor = topicCursorStats.subscriptions[subscriptionName];
                  return <SubscriptionComponent key={subscriptionName} subscriptionName={subscriptionName} cursor={cursor} managedLedger={managedLedger} />
                })}
              </div>
            </div>
          );
        }

        if (topicCursorStats.topicType === 'partitioned') {
          const partitions = topicsInternalStats?.getStatsMap()?.get(topicCursorStats.topic)?.getPartitionedTopicStats()?.getPartitionsMap();
          if (partitions === undefined) {
            return <></>;
          }

          const partitionsElement = Object.keys(topicCursorStats.partitions).map(partitionName => {
            const managedLedger = partitions.get(partitionName)?.getManagedLedgerInternalStats();
            if (managedLedger === undefined) {
              return;
            }

            const partition = topicCursorStats.partitions[partitionName];
            return (
              <div key={partitionName} className={s.Partition}>
                <div className={s.PartitionName}>
                  <strong>Partition: </strong>
                  {partitionName.replace(/^.*partition-/, '')}
                </div>
                <div className={s.TopicCursors}>
                  {Object.keys(partition.subscriptions).length === 0 && (<div className={s.NoSubscriptions}>-</div>)}
                  {Object.keys(partition.subscriptions).map(subscriptionName => {
                    const cursor = partition.subscriptions[subscriptionName];
                    return <SubscriptionComponent key={subscriptionName} subscriptionName={subscriptionName} cursor={cursor} managedLedger={managedLedger} />
                  })}
                </div>
              </div>
            );
          });

          return (
            <div className={s.Topic}>
              <div className={s.TopicName}>
                <strong>Topic: </strong>
                {topicCursorStats.topic}
              </div>
              <div className={s.Partitions}>
                {partitionsElement}
              </div>
            </div>
          );
        }
      })}
    </div>
  );
}

type SubscriptionComponentProps = {
  subscriptionName: string;
  cursor: CursorStats;
  managedLedger: ManagedLedgerInternalStats;
}
const SubscriptionComponent: React.FC<SubscriptionComponentProps> = (props) => {
  return (
    <div className={s.SubscriptionComponent}>
      <div className={s.SubscriptionName}>
        <strong>Subscription: </strong>
        {props.subscriptionName}
      </div>
      <SubscriptionCursor {...getSubscriptionCursorProps(props.managedLedger, props.cursor)} />
    </div>
  );
}

function getSubscriptionCursorProps(managedLedger: ManagedLedgerInternalStats, cursor: CursorStats): SubscriptionCursorProps {
  return {
    managedLedgerInternalStats: {
      currentLedgerEntries: managedLedger.getCurrentLedgerEntries(),
      currentLedgerSize: managedLedger.getCurrentLedgerSize(),
      entriesAddedCounter: managedLedger.getEntriesAddedCounter(),
      lastConfirmedEntry: managedLedger.getLastConfirmedEntry(),
      lastLedgerCreatedTimestamp: managedLedger.getLastLedgerCreatedTimestamp(),
      lastLedgerCreationFailureTimestamp: managedLedger.getLastLedgerCreationFailureTimestamp(),
      ledgers: managedLedger.getLedgersList().map(ledger => ({
        entries: ledger.getEntries(),
        size: ledger.getSize(),
        ledgerId: ledger.getLedgerId(),
        metadata: ledger.getMetadata(),
        offloaded: ledger.getOffloaded(),
        underReplicated: ledger.getUnderReplicated(),
      })),
      numberOfEntries: managedLedger.getNumberOfEntries(),
      pendingEntriesCount: managedLedger.getPendingEntriesCount(),
      state: managedLedger.getState(),
      totalSize: managedLedger.getTotalSize(),
      waitingCursorsCount: managedLedger.getWaitingCursorsCount(),
    },
    cursor: {
      markDeletePosition: cursor.getMarkDeletePosition(),
      readPosition: cursor.getReadPosition(),
      waitingReadOp: cursor.getWaitingReadOp(),
      pendingReadOps: cursor.getPendingReadOps(),
      messagesConsumedCounter: cursor.getMessagesConsumedCounter(),
      cursorLedger: cursor.getCursorLedger(),
      cursorLedgerLastEntry: cursor.getCursorLedgerLastEntry(),
      individuallyDeletedMessages: cursor.getIndividuallyDeletedMessages(),
      lastLedgerSwitchTimestamp: cursor.getLastLedgerSwitchTimestamp(),
      state: cursor.getState(),
      numberOfEntriesSinceFirstNotAckedMessage: cursor.getNumberOfEntriesSinceFirstNotAckedMessage(),
      totalNonContiguousDeletedMessagesRange: cursor.getTotalNonContiguousDeletedMessagesRange(),
      subscriptionHavePendingRead: cursor.getSubscriptionHavePendingRead(),
      subscriptionHavePendingReplayRead: cursor.getSubscriptionHavePendingReplayRead(),
      properties: (() => {
        let properties: Record<string, number> = {};
        cursor.getPropertiesMap().forEach((value, key) => properties = { ...properties, [key]: value });
        return properties;
      })()
    }
  }
}

export default SubscriptionsCursors;
