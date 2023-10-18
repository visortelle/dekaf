import React, { useEffect, useMemo } from 'react';
import s from './SubscriptionsCursors.module.css'
import { CursorStats, GetTopicsInternalStatsResponse, ManagedLedgerInternalStats, TopicInternalStats } from '../../../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb';
import { ConsumerSessionConfig, SessionState } from '../../types';
import SubscriptionCursor, { SubscriptionCursorProps, Cursor } from './SubscriptionCursor/SubscriptionCursor';

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
  sessionKey: number;
  sessionConfig: ConsumerSessionConfig;
  selector: CursorSelector;
  sessionState: SessionState;
  sessionSubscriptionName: string;
  onSessionStateChange: (sessionState: SessionState) => void;
  topicsInternalStats: GetTopicsInternalStatsResponse | undefined;
};

const SubscriptionsCursors: React.FC<SubscriptionsCursorsProps> = (props) => {
  const [sessionStartStats, setSessionStartStats] = React.useState<ReturnType<GetTopicsInternalStatsResponse['getStatsMap']>>();

  const topics = useMemo(() => Object.keys(props.selector), [props.selector]);

  useEffect(() => {
    if (props.sessionState !== 'awaiting-initial-cursor-positions' || props.topicsInternalStats === undefined) {
      return;
    }

    if (props.sessionConfig.topicsSelector.type !== 'by-names') {
      props.onSessionStateChange('got-initial-cursor-positions');
      return;
    }

    const gotInitialCursorsPositions = props.sessionConfig.topicsSelector.topics.every(topic => {
      if (props.topicsInternalStats === undefined) {
        return;
      }

      const hasCursor = getCursorForSubscription(props.topicsInternalStats.getStatsMap(), topic, { type: 'any-partition' }, props.sessionSubscriptionName);
      return hasCursor;
    });

    if (gotInitialCursorsPositions) {
      setSessionStartStats(props.topicsInternalStats.getStatsMap());
      props.onSessionStateChange('got-initial-cursor-positions');
    }
  }, [props.topicsInternalStats, props.sessionState, props.sessionConfig]);

  const statsMapPb = props.topicsInternalStats?.getStatsMap();

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
  if (sessionStartStats === undefined) {
    return null;
  }
  return (
    <div className={s.SubscriptionsCursors}>
      {topicsCursorStats.map((topicCursorStats) => {
        if (topicCursorStats.topicType === 'non-partitioned') {
          const managedLedger = props.topicsInternalStats?.getStatsMap()?.get(topicCursorStats.topic)?.getTopicStats()?.getManagedLedgerInternalStats();
          if (managedLedger === undefined) {
            return null;
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
                  return (
                    <SubscriptionComponent
                      key={subscriptionName}
                      subscriptionName={subscriptionName}
                      cursor={cursor}
                      managedLedger={managedLedger}
                      partitionSelector={{ type: 'non-partitioned' }}
                      sessionStartStats={sessionStartStats}
                      subscription={subscriptionName}
                      topic={topicCursorStats.topic}
                    />
                  );
                })}
              </div>
            </div>
          );
        }

        if (topicCursorStats.topicType === 'partitioned') {
          const partitions = props.topicsInternalStats?.getStatsMap()?.get(topicCursorStats.topic)?.getPartitionedTopicStats()?.getPartitionsMap();
          if (partitions === undefined) {
            return null;
          }

          const partitionsElement = Object.keys(topicCursorStats.partitions).map(partitionName => {
            const managedLedger = partitions.get(partitionName)?.getManagedLedgerInternalStats();
            if (managedLedger === undefined) {
              return null;
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
                    return (
                      <SubscriptionComponent
                        key={subscriptionName}
                        subscriptionName={subscriptionName}
                        cursor={cursor}
                        managedLedger={managedLedger}
                        partitionSelector={{ type: 'partition', partitionName }}
                        sessionStartStats={sessionStartStats}
                        subscription={subscriptionName}
                        topic={topicCursorStats.topic}
                      />
                    );
                  })}
                </div>
              </div>
            );
          });

          return (
            <div key={topicCursorStats.topic} className={s.Topic}>
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
  sessionStartStats: ReturnType<GetTopicsInternalStatsResponse['getStatsMap']>;
  managedLedger: ManagedLedgerInternalStats;
  topic: string;
  partitionSelector: PartitionSelector;
  subscription: string;
}
const SubscriptionComponent: React.FC<SubscriptionComponentProps> = (props) => {
  const subscriptionCursorProps = getSubscriptionCursorProps({
    cursor: props.cursor,
    managedLedger: props.managedLedger,
    partitionSelector: props.partitionSelector,
    sessionStartStats: props.sessionStartStats,
    subscription: props.subscription,
    topic: props.topic,
  });
  if (subscriptionCursorProps === undefined) {
    return null;
  }

  return (
    <div className={s.SubscriptionComponent}>
      <div className={s.SubscriptionName}>
        <strong>Subscription: </strong>
        {props.subscriptionName}
      </div>
      <SubscriptionCursor {...subscriptionCursorProps} />
    </div>
  );
}

type GetSubscriptionCursorPropsArgs = {
  sessionStartStats: ReturnType<GetTopicsInternalStatsResponse['getStatsMap']>;
  managedLedger: ManagedLedgerInternalStats;
  cursor: CursorStats;
  topic: string,
  partitionSelector: PartitionSelector,
  subscription: string;
}
function getSubscriptionCursorProps(props: GetSubscriptionCursorPropsArgs): SubscriptionCursorProps | undefined {
  const { cursor, managedLedger, partitionSelector, sessionStartStats, subscription, topic } = props;

  const sessionStartCursorStats = getCursorForSubscription(sessionStartStats, topic, partitionSelector, subscription);
  if (sessionStartCursorStats === undefined) {
    return undefined;
  }

  return {
    managedLedgerInternalStats: {
      currentLedgerEntries: managedLedger.getCurrentLedgerEntries()?.getValue(),
      currentLedgerSize: managedLedger.getCurrentLedgerSize()?.getValue(),
      entriesAddedCounter: managedLedger.getEntriesAddedCounter()?.getValue(),
      lastConfirmedEntry: managedLedger.getLastConfirmedEntry()?.getValue(),
      lastLedgerCreatedTimestamp: managedLedger.getLastLedgerCreatedTimestamp()?.getValue(),
      lastLedgerCreationFailureTimestamp: managedLedger.getLastLedgerCreationFailureTimestamp()?.getValue(),
      ledgers: managedLedger.getLedgersList().map(ledger => ({
        entries: ledger.getEntries()?.getValue(),
        size: ledger.getSize()?.getValue(),
        ledgerId: ledger.getLedgerId()?.getValue(),
        metadata: ledger.getMetadata()?.getValue(),
        offloaded: ledger.getOffloaded()?.getValue(),
        underReplicated: ledger.getUnderReplicated()?.getValue(),
      })),
      numberOfEntries: managedLedger.getNumberOfEntries()?.getValue(),
      pendingEntriesCount: managedLedger.getPendingEntriesCount()?.getValue(),
      state: managedLedger.getState()?.getValue(),
      totalSize: managedLedger.getTotalSize()?.getValue(),
      waitingCursorsCount: managedLedger.getWaitingCursorsCount()?.getValue(),
    },
    sessionStartCursor: cursorStatsToCursor(sessionStartCursorStats),
    cursor: cursorStatsToCursor(cursor),
  }
}

function cursorStatsToCursor(stats: CursorStats): Cursor {
  return {
    markDeletePosition: stats.getMarkDeletePosition()?.getValue(),
    readPosition: stats.getReadPosition()?.getValue(),
    waitingReadOp: stats.getWaitingReadOp()?.getValue(),
    pendingReadOps: stats.getPendingReadOps()?.getValue(),
    messagesConsumedCounter: stats.getMessagesConsumedCounter()?.getValue(),
    cursorLedger: stats.getCursorLedger()?.getValue(),
    cursorLedgerLastEntry: stats.getCursorLedgerLastEntry()?.getValue(),
    individuallyDeletedMessages: stats.getIndividuallyDeletedMessages()?.getValue(),
    lastLedgerSwitchTimestamp: stats.getLastLedgerSwitchTimestamp()?.getValue(),
    state: stats.getState()?.getValue(),
    numberOfEntriesSinceFirstNotAckedMessage: stats.getNumberOfEntriesSinceFirstNotAckedMessage()?.getValue(),
    totalNonContiguousDeletedMessagesRange: stats.getTotalNonContiguousDeletedMessagesRange()?.getValue(),
    subscriptionHavePendingRead: stats.getSubscriptionHavePendingRead()?.getValue(),
    subscriptionHavePendingReplayRead: stats.getSubscriptionHavePendingReplayRead()?.getValue(),
    properties: (() => {
      let properties: Record<string, number> = {};
      stats.getPropertiesMap().forEach((value, key) => properties = { ...properties, [key]: value });
      return properties;
    })()
  }
}

type PartitionSelector = { type: 'any-partition' } | { type: 'non-partitioned' } | { type: 'partition', partitionName: string };
function getCursorForSubscription(
  stats: ReturnType<GetTopicsInternalStatsResponse['getStatsMap']>,
  topic: string,
  partitionSelector: PartitionSelector,
  subscription: string
): CursorStats | undefined {
  if (partitionSelector.type === 'non-partitioned') {
    return stats.get(topic)?.getTopicStats()?.getManagedLedgerInternalStats()?.getCursorsMap()?.get(subscription);
  }
  if (partitionSelector.type === 'partition') {
    return stats.get(topic)?.getPartitionedTopicStats()?.getPartitionsMap()?.get(partitionSelector.partitionName)?.getManagedLedgerInternalStats()?.getCursorsMap()?.get(subscription);
  }
  if (partitionSelector.type === 'any-partition') {
    const nonPartitionedTopicCursor = stats.get(topic)?.getTopicStats()?.getManagedLedgerInternalStats()?.getCursorsMap()?.get(subscription);
    if (nonPartitionedTopicCursor !== undefined) {
      return nonPartitionedTopicCursor;
    }

    const partitions = stats.get(topic)?.getPartitionedTopicStats()?.getPartitionsMap();
    let cursor: CursorStats | undefined = undefined;
    partitions?.forEach((partition) => {
      if (cursor !== undefined) {
        return;
      }
      const _cursor = partition.getManagedLedgerInternalStats()?.getCursorsMap()?.get(subscription);
      if (_cursor !== undefined) {
        cursor = _cursor;
      }
    });
    return cursor;
  }
}

export default SubscriptionsCursors;
