import React from 'react';
import s from './Subscriptions.module.css'
import * as GrpcClient from '../../app/contexts/GrpcClient/GrpcClient';
import * as Notifications from '../../app/contexts/Notifications';
import * as I18n from '../../app/contexts/I18n/I18n';
import * as pb from '../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb';
import * as pbUtils from '../../../pbUtils/pbUtils';
import Table from '../../ui/Table/Table';
import { help } from './help';
import Link from '../../ui/Link/Link';
import { routes } from '../../routes';

export type ColumnKey =
  'subscriptionName' |
  'msgRateOut' |
  'msgThroughputOut' |
  'bytesOutCounter' |
  'msgOutCounter' |
  'msgRateRedeliver' |
  'messageAckRate' |
  'chunkedMessageRate' |
  'msgBacklog' |
  'backlogSize' |
  'earliestMsgPublishTimeInBacklog' |
  'msgBacklogNoDelayed' |
  'isBlockedSubscriptionOnUnackedMsgs' |
  'msgDelayed' |
  'unackedMessages' |
  'type' |
  'activeConsumerName' |
  'msgRateExpired' |
  'totalMsgExpired' |
  'lastExpireTimestamp' |
  'lastConsumedFlowTimestamp' |
  'lastConsumedTimestamp' |
  'lastAckedTimestamp' |
  'lastMarkDeleteAdvancedTimestamp' |
  'consumersCount' |
  'isDurable' |
  'isReplicated' |
  'isAllowOutOfOrderDelivery' |
  'keySharedMode' |
  'consumersAfterMarkDeletePosition' |
  'subscriptionProperties' |
  'nonContiguousDeletedMessagesRanges' |
  'nonContiguousDeletedMessagesRangesSerializedSize' |
  'filterProcessedMsgCount' |
  'filterAcceptedMsgCount' |
  'filterRejectedMsgCount' |
  'filterRescheduledMsgCount' |
  'delayedMessageIndexSizeInBytes';

export type DataEntry = {
  subscriptionName: string;
  msgRateOut?: number;
  msgThroughputOut?: number;
  bytesOutCounter?: number;
  msgOutCounter?: number;
  msgRateRedeliver?: number;
  messageAckRate?: number;
  chunkedMessageRate?: number;
  msgBacklog?: number;
  backlogSize?: number;
  earliestMsgPublishTimeInBacklog?: number;
  msgBacklogNoDelayed?: number;
  isBlockedSubscriptionOnUnackedMsgs?: boolean;
  msgDelayed?: number;
  unackedMessages?: number;
  type?: string;
  activeConsumerName?: string;
  msgRateExpired?: number;
  totalMsgExpired?: number;
  lastExpireTimestamp?: number;
  lastConsumedFlowTimestamp?: number;
  lastConsumedTimestamp?: number;
  lastAckedTimestamp?: number;
  lastMarkDeleteAdvancedTimestamp?: number;
  consumersCount?: number;
  isDurable?: boolean;
  isReplicated?: boolean;
  isAllowOutOfOrderDelivery?: boolean;
  keySharedMode?: string;
  consumersAfterMarkDeletePosition?: Record<string, string>;
  subscriptionProperties?: Record<string, string>;
  nonContiguousDeletedMessagesRanges?: number;
  nonContiguousDeletedMessagesRangesSerializedSize?: number;
  filterProcessedMsgCount?: number;
  filterAcceptedMsgCount?: number;
  filterRejectedMsgCount?: number;
  filterRescheduledMsgCount?: number;
  delayedMessageIndexSizeInBytes?: number;
}

export type SubscriptionsProps = {
  tenant: string;
  namespace: string;
  topic: string;
  topicType: "persistent" | "non-persistent";
};

const Subscriptions: React.FC<SubscriptionsProps> = (props) => {
  const { topicServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const i18n = I18n.useContext();

  const topicFqn = `${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`;

  const dataLoaderCacheKey = [`subscriptions-${topicFqn}`];
  const dataLoader = async () => {
    const req = new pb.GetTopicsStatsRequest();

    req.setIsGetPreciseBacklog(true);
    req.setIsEarliestTimeInBacklog(true);
    req.setIsSubscriptionBacklogSize(true);
    req.setIsPerPartition(false);

    req.setTopicsList([topicFqn]);
    req.setPartitionedTopicsList([topicFqn]);

    const res = await topicServiceClient.getTopicsStats(req, null)
      .catch((err) => notifyError(`Unable to get topics stats: ${err}`));

    if (res === undefined) {
      return [];
    }

    const stats = findTopicStats(res, topicFqn);

    if (stats === undefined) {
      notifyError(`Unable to find stats for topic ${topicFqn}`);
      return [];
    }

    return dataEntriesFromPb(stats);
  }

  return (
    <div className={s.Subscriptions}>
      <Table<ColumnKey, DataEntry, {}>
        columns={{
          help,
          columns: {
            activeConsumerName: {
              title: 'Active Consumer Name',
              render: (de) => i18n.withVoidDefault(de.activeConsumerName, v => v),
              sortFn: (a, b) => a.data.activeConsumerName?.localeCompare(b.data.activeConsumerName ?? '') ?? 0,
            },
            backlogSize: {
              title: 'Backlog Size',
              render: (de) => i18n.withVoidDefault(de.backlogSize, i18n.formatBytes),
              sortFn: (a, b) => (a.data.backlogSize ?? 0) - (b.data.backlogSize ?? 0),
            },
            bytesOutCounter: {
              title: 'Bytes Out Counter',
              render: (de) => i18n.withVoidDefault(de.bytesOutCounter, i18n.formatBytes),
              sortFn: (a, b) => (a.data.bytesOutCounter ?? 0) - (b.data.bytesOutCounter ?? 0),
            },
            chunkedMessageRate: {
              title: 'Chunked Message Rate',
              render: (de) => i18n.withVoidDefault(de.chunkedMessageRate, i18n.formatCountRate),
              sortFn: (a, b) => (a.data.chunkedMessageRate ?? 0) - (b.data.chunkedMessageRate ?? 0),
            },
            consumersAfterMarkDeletePosition: {
              title: 'Consumers After Mark Delete Position',
              render: (de) => i18n.withVoidDefault(de.consumersAfterMarkDeletePosition, v => JSON.stringify(v, null, 4)),
            },
            consumersCount: {
              title: 'Consumers',
              render: (de) => i18n.withVoidDefault(de.consumersCount, v =>
                <Link
                  to={routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.subscriptions.subscription.consumers._.get({
                    tenant: props.tenant,
                    namespace: props.namespace,
                    topic: props.topic,
                    topicType: props.topicType,
                    subscription: de.subscriptionName,
                  })}
                >
                  {v}
                </Link>
              ),
              sortFn: (a, b) => (a.data.consumersCount ?? 0) - (b.data.consumersCount ?? 0),
            },
            delayedMessageIndexSizeInBytes: {
              title: 'Delayed Message Index Size',
              render: (de) => i18n.withVoidDefault(de.delayedMessageIndexSizeInBytes, i18n.formatBytes),
              sortFn: (a, b) => (a.data.delayedMessageIndexSizeInBytes ?? 0) - (b.data.delayedMessageIndexSizeInBytes ?? 0),
            },
            earliestMsgPublishTimeInBacklog: {
              title: 'Earliest Message Publish Time In Backlog',
              render: (de) => i18n.withVoidDefault(de.earliestMsgPublishTimeInBacklog === undefined ? undefined : new Date(de.earliestMsgPublishTimeInBacklog), i18n.formatDateTime),
              sortFn: (a, b) => (a.data.earliestMsgPublishTimeInBacklog ?? 0) - (b.data.earliestMsgPublishTimeInBacklog ?? 0),
            },
            filterAcceptedMsgCount: {
              title: 'Filter Accepted Message Count',
              render: (de) => i18n.withVoidDefault(de.filterAcceptedMsgCount, i18n.formatCount),
              sortFn: (a, b) => (a.data.filterAcceptedMsgCount ?? 0) - (b.data.filterAcceptedMsgCount ?? 0),
            },
            filterProcessedMsgCount: {
              title: 'Filter Processed Message Count',
              render: (de) => i18n.withVoidDefault(de.filterProcessedMsgCount, i18n.formatCount),
              sortFn: (a, b) => (a.data.filterProcessedMsgCount ?? 0) - (b.data.filterProcessedMsgCount ?? 0),
            },
            filterRejectedMsgCount: {
              title: 'Filter Rejected Message Count',
              render: (de) => i18n.withVoidDefault(de.filterRejectedMsgCount, i18n.formatCount),
              sortFn: (a, b) => (a.data.filterRejectedMsgCount ?? 0) - (b.data.filterRejectedMsgCount ?? 0),
            },
            filterRescheduledMsgCount: {
              title: 'Filter Rescheduled Message Count',
              render: (de) => i18n.withVoidDefault(de.filterRescheduledMsgCount, i18n.formatCount),
              sortFn: (a, b) => (a.data.filterRescheduledMsgCount ?? 0) - (b.data.filterRescheduledMsgCount ?? 0),
            },
            isAllowOutOfOrderDelivery: {
              title: 'Is Allow Out Of Order Delivery',
              render: (de) => i18n.withVoidDefault(de.isAllowOutOfOrderDelivery, i18n.formatBoolean),
              sortFn: (a, b) => Number(a.data.isAllowOutOfOrderDelivery) - Number(b.data.isAllowOutOfOrderDelivery),
            },
            isBlockedSubscriptionOnUnackedMsgs: {
              title: 'Is Blocked Subscription On Unacked Messages',
              render: (de) => i18n.withVoidDefault(de.isBlockedSubscriptionOnUnackedMsgs, i18n.formatBoolean),
              sortFn: (a, b) => Number(a.data.isBlockedSubscriptionOnUnackedMsgs) - Number(b.data.isBlockedSubscriptionOnUnackedMsgs),
            },
            isDurable: {
              title: 'Is Durable',
              render: (de) => i18n.withVoidDefault(de.isDurable, i18n.formatBoolean),
              sortFn: (a, b) => Number(a.data.isDurable) - Number(b.data.isDurable),
            },
            isReplicated: {
              title: 'Is Replicated',
              render: (de) => i18n.withVoidDefault(de.isReplicated, i18n.formatBoolean),
              sortFn: (a, b) => Number(a.data.isReplicated) - Number(b.data.isReplicated),
            },
            keySharedMode: {
              title: 'Key Shared Mode',
              render: (de) => i18n.withVoidDefault(de.keySharedMode, v => v),
              sortFn: (a, b) => (a.data.keySharedMode ?? '').localeCompare(b.data.keySharedMode ?? ''),
            },
            lastAckedTimestamp: {
              title: 'Last Acknowledged Timestamp',
              render: (de) => i18n.withVoidDefault(de.lastAckedTimestamp === undefined ? undefined : new Date(de.lastAckedTimestamp), i18n.formatDateTime),
              sortFn: (a, b) => (a.data.lastAckedTimestamp ?? 0) - (b.data.lastAckedTimestamp ?? 0),
            },
            lastConsumedFlowTimestamp: {
              title: 'Last Consumed Flow Timestamp',
              render: (de) => i18n.withVoidDefault(de.lastConsumedFlowTimestamp === undefined ? undefined : new Date(de.lastConsumedFlowTimestamp), i18n.formatDateTime),
              sortFn: (a, b) => (a.data.lastConsumedFlowTimestamp ?? 0) - (b.data.lastConsumedFlowTimestamp ?? 0),
            },
            lastConsumedTimestamp: {
              title: 'Last Consumed Timestamp',
              render: (de) => i18n.withVoidDefault(de.lastConsumedTimestamp === undefined ? undefined : new Date(de.lastConsumedTimestamp), i18n.formatDateTime),
              sortFn: (a, b) => (a.data.lastConsumedTimestamp ?? 0) - (b.data.lastConsumedTimestamp ?? 0),
            },
            lastExpireTimestamp: {
              title: 'Last Expire Timestamp',
              render: (de) => i18n.withVoidDefault(de.lastExpireTimestamp === undefined ? undefined : new Date(de.lastExpireTimestamp), i18n.formatDateTime),
              sortFn: (a, b) => (a.data.lastExpireTimestamp ?? 0) - (b.data.lastExpireTimestamp ?? 0),
            },
            lastMarkDeleteAdvancedTimestamp: {
              title: 'Last Mark Delete Advanced Timestamp',
              render: (de) => i18n.withVoidDefault(de.lastMarkDeleteAdvancedTimestamp === undefined ? undefined : new Date(de.lastMarkDeleteAdvancedTimestamp), i18n.formatDateTime),
              sortFn: (a, b) => (a.data.lastMarkDeleteAdvancedTimestamp ?? 0) - (b.data.lastMarkDeleteAdvancedTimestamp ?? 0),
            },
            messageAckRate: {
              title: 'Message Acknowledgement Rate',
              render: (de) => i18n.withVoidDefault(de.messageAckRate, i18n.formatCountRate),
              sortFn: (a, b) => (a.data.messageAckRate ?? 0) - (b.data.messageAckRate ?? 0),
            },
            msgBacklog: {
              title: 'Message Backlog',
              render: (de) => i18n.withVoidDefault(de.msgBacklog, i18n.formatCount),
              sortFn: (a, b) => (a.data.msgBacklog ?? 0) - (b.data.msgBacklog ?? 0),
            },
            msgDelayed: {
              title: 'Message Delayed',
              render: (de) => i18n.withVoidDefault(de.msgDelayed, i18n.formatCount),
              sortFn: (a, b) => (a.data.msgDelayed ?? 0) - (b.data.msgDelayed ?? 0),
            },
            msgRateExpired: {
              title: 'Message Expired Rate',
              render: (de) => i18n.withVoidDefault(de.msgRateExpired, i18n.formatCountRate),
              sortFn: (a, b) => (a.data.msgRateExpired ?? 0) - (b.data.msgRateExpired ?? 0),
            },
            msgRateOut: {
              title: 'Message Out Rate',
              render: (de) => i18n.withVoidDefault(de.msgRateOut, i18n.formatCountRate),
              sortFn: (a, b) => (a.data.msgRateOut ?? 0) - (b.data.msgRateOut ?? 0),
            },
            msgBacklogNoDelayed: {
              title: 'Message Backlog No Delayed',
              render: (de) => i18n.withVoidDefault(de.msgBacklogNoDelayed, i18n.formatCount),
              sortFn: (a, b) => (a.data.msgBacklogNoDelayed ?? 0) - (b.data.msgBacklogNoDelayed ?? 0),
            },
            msgOutCounter: {
              title: 'Message Out Counter',
              render: (de) => i18n.withVoidDefault(de.msgOutCounter, i18n.formatCount),
              sortFn: (a, b) => (a.data.msgOutCounter ?? 0) - (b.data.msgOutCounter ?? 0),
            },
            msgRateRedeliver: {
              title: 'Message Redelivery Rate',
              render: (de) => i18n.withVoidDefault(de.msgRateRedeliver, i18n.formatCountRate),
              sortFn: (a, b) => (a.data.msgRateRedeliver ?? 0) - (b.data.msgRateRedeliver ?? 0),
            },
            msgThroughputOut: {
              title: 'Message Throughput Out',
              render: (de) => i18n.withVoidDefault(de.msgThroughputOut, i18n.formatBytesRate),
              sortFn: (a, b) => (a.data.msgThroughputOut ?? 0) - (b.data.msgThroughputOut ?? 0),
            },
            nonContiguousDeletedMessagesRanges: {
              title: 'Non Contiguous Deleted Messages Ranges',
              render: (de) => i18n.withVoidDefault(de.nonContiguousDeletedMessagesRanges, i18n.formatCount),
              sortFn: (a, b) => (a.data.nonContiguousDeletedMessagesRanges ?? 0) - (b.data.nonContiguousDeletedMessagesRanges ?? 0),
            },
            nonContiguousDeletedMessagesRangesSerializedSize: {
              title: 'Non Contiguous Deleted Messages Ranges Serialized Size',
              render: (de) => i18n.withVoidDefault(de.nonContiguousDeletedMessagesRangesSerializedSize, i18n.formatBytes),
              sortFn: (a, b) => (a.data.nonContiguousDeletedMessagesRangesSerializedSize ?? 0) - (b.data.nonContiguousDeletedMessagesRangesSerializedSize ?? 0),
            },
            subscriptionName: {
              title: 'Subscription Name',
              render: (de) => (
                <Link to={routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.subscriptions.subscription.overview._.get({
                  tenant: props.tenant,
                  namespace: props.namespace,
                  topic: props.topic,
                  topicType: props.topicType,
                  subscription: de.subscriptionName,
                })}>
                  {de.subscriptionName}
                </Link>
              ),
              sortFn: (a, b) => a.data.subscriptionName.localeCompare(b.data.subscriptionName),
            },
            subscriptionProperties: {
              title: 'Subscription Properties',
              render: (de) => i18n.withVoidDefault(de.subscriptionProperties, v => JSON.stringify(v, null, 4)),
            },
            totalMsgExpired: {
              title: 'Total Message Expired',
              render: (de) => i18n.withVoidDefault(de.totalMsgExpired, i18n.formatCount),
              sortFn: (a, b) => (a.data.totalMsgExpired ?? 0) - (b.data.totalMsgExpired ?? 0),
            },
            type: {
              title: 'Type',
              render: (de) => de.type,
              sortFn: (a, b) => (a.data.type || '').localeCompare(b.data.type || ''),
            },
            unackedMessages: {
              title: 'Unacked Messages',
              render: (de) => i18n.withVoidDefault(de.unackedMessages, i18n.formatCount),
              sortFn: (a, b) => (a.data.unackedMessages ?? 0) - (b.data.unackedMessages ?? 0),
            }
          },
          defaultConfig: [
            { key: "subscriptionName", width: 300, visibility: 'visible', stickyTo: 'left' },
            { key: "type", width: 80, visibility: 'visible' },
            { key: "isDurable", width: 80, visibility: 'visible' },
            { key: "consumersCount", width: 80, visibility: 'visible' },
            { key: "activeConsumerName", width: 300, visibility: 'visible' },
            { key: "msgRateOut", width: 120, visibility: 'visible' },
            { key: "msgThroughputOut", width: 120, visibility: 'visible' },
            { key: "bytesOutCounter", width: 120, visibility: 'visible' },
            { key: "msgOutCounter", width: 120, visibility: 'visible' },
            { key: "msgRateRedeliver", width: 120, visibility: 'visible' },
            { key: "messageAckRate", width: 120, visibility: 'visible' },
            { key: "chunkedMessageRate", width: 120, visibility: 'visible' },
            { key: "msgBacklog", width: 200, visibility: 'visible' },
            { key: "backlogSize", width: 200, visibility: 'visible' },
            { key: "earliestMsgPublishTimeInBacklog", width: 200, visibility: 'visible' },
            { key: "msgBacklogNoDelayed", width: 200, visibility: 'visible' },
            { key: "isBlockedSubscriptionOnUnackedMsgs", width: 200, visibility: 'visible' },
            { key: "msgDelayed", width: 200, visibility: 'visible' },
            { key: "unackedMessages", width: 200, visibility: 'visible' },
            { key: "msgRateExpired", width: 200, visibility: 'visible' },
            { key: "totalMsgExpired", width: 200, visibility: 'visible' },
            { key: "lastExpireTimestamp", width: 200, visibility: 'visible' },
            { key: "lastConsumedFlowTimestamp", width: 200, visibility: 'visible' },
            { key: "lastConsumedTimestamp", width: 200, visibility: 'visible' },
            { key: "lastAckedTimestamp", width: 200, visibility: 'visible' },
            { key: "lastMarkDeleteAdvancedTimestamp", width: 200, visibility: 'visible' },
            { key: "isReplicated", width: 200, visibility: 'visible' },
            { key: "isAllowOutOfOrderDelivery", width: 200, visibility: 'visible' },
            { key: "keySharedMode", width: 200, visibility: 'visible' },
            { key: "consumersAfterMarkDeletePosition", width: 200, visibility: 'visible' },
            { key: "subscriptionProperties", width: 200, visibility: 'visible' },
            { key: "nonContiguousDeletedMessagesRanges", width: 200, visibility: 'visible' },
            { key: "nonContiguousDeletedMessagesRangesSerializedSize", width: 200, visibility: 'visible' },
            { key: "filterProcessedMsgCount", width: 200, visibility: 'visible' },
            { key: "filterAcceptedMsgCount", width: 200, visibility: 'visible' },
            { key: "filterRejectedMsgCount", width: 200, visibility: 'visible' },
            { key: "filterRescheduledMsgCount", width: 200, visibility: 'visible' },
            { key: "delayedMessageIndexSizeInBytes", width: 200, visibility: 'visible' }
          ],
        }}
        dataLoader={{
          cacheKey: dataLoaderCacheKey,
          loader: dataLoader
        }}
        tableId='subscriptions'
        autoRefresh={{
          intervalMs: 5000,
        }}
        getId={(entry) => entry.subscriptionName}
        defaultSort={{ column: 'subscriptionName', direction: 'asc', type: 'by-single-column' }}
      />
    </div>
  );
}

function dataEntriesFromPb(statsPb: pb.TopicStats): DataEntry[] {
  const subscriptions = pbUtils.mapToObject(statsPb.getSubscriptionsMap());

  return Object.entries(subscriptions).map(([subscriptionName, subscription]) => {
    const dataEntry: DataEntry = {
      subscriptionName,
      activeConsumerName: subscription.getActiveConsumerName()?.getValue(),
      backlogSize: subscription.getBacklogSize()?.getValue(),
      bytesOutCounter: subscription.getBytesOutCounter()?.getValue(),
      chunkedMessageRate: subscription.getChunkedMessageRate()?.getValue(),
      consumersAfterMarkDeletePosition: pbUtils.mapToObject(subscription.getConsumersAfterMarkDeletePositionMap()),
      consumersCount: subscription.getConsumersList().length,
      delayedMessageIndexSizeInBytes: subscription.getDelayedMessageIndexSizeInBytes()?.getValue(),
      earliestMsgPublishTimeInBacklog: subscription.getEarliestMsgPublishTimeInBacklog()?.getValue() || undefined,
      filterAcceptedMsgCount: subscription.getFilterAcceptedMsgCount()?.getValue(),
      filterProcessedMsgCount: subscription.getFilterProcessedMsgCount()?.getValue(),
      filterRejectedMsgCount: subscription.getFilterRejectedMsgCount()?.getValue(),
      filterRescheduledMsgCount: subscription.getFilterRescheduledMsgCount()?.getValue(),
      isAllowOutOfOrderDelivery: subscription.getIsAllowOutOfOrderDelivery()?.getValue(),
      isBlockedSubscriptionOnUnackedMsgs: subscription.getIsBlockedSubscriptionOnUnackedMsgs()?.getValue(),
      isDurable: subscription.getIsDurable()?.getValue(),
      isReplicated: subscription.getIsReplicated()?.getValue(),
      keySharedMode: subscription.getKeySharedMode()?.getValue(),
      lastAckedTimestamp: subscription.getLastAckedTimestamp()?.getValue() || undefined,
      lastConsumedFlowTimestamp: subscription.getLastConsumedFlowTimestamp()?.getValue() || undefined,
      lastConsumedTimestamp: subscription.getLastConsumedTimestamp()?.getValue() || undefined,
      lastExpireTimestamp: subscription.getLastExpireTimestamp()?.getValue() || undefined,
      lastMarkDeleteAdvancedTimestamp: subscription.getLastMarkDeleteAdvancedTimestamp()?.getValue() || undefined,
      messageAckRate: subscription.getMessageAckRate()?.getValue(),
      msgBacklog: subscription.getMsgBacklog()?.getValue(),
      msgBacklogNoDelayed: subscription.getMsgBacklogNoDelayed()?.getValue(),
      msgDelayed: subscription.getMsgDelayed()?.getValue(),
      msgOutCounter: subscription.getMsgOutCounter()?.getValue(),
      msgRateExpired: subscription.getMsgRateExpired()?.getValue(),
      msgRateOut: subscription.getMsgRateOut()?.getValue(),
      msgRateRedeliver: subscription.getMsgRateRedeliver()?.getValue(),
      msgThroughputOut: subscription.getMsgThroughputOut()?.getValue(),
      nonContiguousDeletedMessagesRanges: subscription.getNonContiguousDeletedMessagesRanges()?.getValue(),
      nonContiguousDeletedMessagesRangesSerializedSize: subscription.getNonContiguousDeletedMessagesRangesSerializedSize()?.getValue(),
      subscriptionProperties: pbUtils.mapToObject(subscription.getSubscriptionPropertiesMap()),
      totalMsgExpired: subscription.getTotalMsgExpired()?.getValue(),
      type: subscription.getType()?.getValue(),
      unackedMessages: subscription.getUnackedMessages()?.getValue()
    }

    return dataEntry;
  });
}

function findTopicStats(stats: pb.GetTopicsStatsResponse, topicFqn: string): pb.TopicStats | undefined {
  let maybeNonPartitionedTopic = stats.getTopicStatsMap().get(topicFqn);
  let maybePartitionedTopic = stats.getPartitionedTopicStatsMap().get(topicFqn);

  if (maybeNonPartitionedTopic !== undefined) {
    return maybeNonPartitionedTopic;
  }
  if (maybePartitionedTopic !== undefined) {
    return maybePartitionedTopic.getStats();
  }
}

export default Subscriptions;
