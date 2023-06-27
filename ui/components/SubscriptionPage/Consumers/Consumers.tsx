import React from 'react';
import s from './Consumers.module.css'
import * as GrpcClient from '../../app/contexts/GrpcClient/GrpcClient';
import * as Notifications from '../../app/contexts/Notifications';
import * as I18n from '../../app/contexts/I18n/I18n';
import * as pb from '../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb';
import * as pbUtils from '../../../pbUtils/pbUtils';
import Table from '../../ui/Table/Table';
import { help } from './help';

export type ColumnKey =
  'msgRateOut' |
  'msgThroughputOut' |
  'bytesOutCounter' |
  'msgOutCounter' |
  'msgRateRedeliver' |
  'messageAckRate' |
  'chunkedMessageRate' |
  'consumerName' |
  'availablePermits' |
  'unackedMessages' |
  'avgMessagesPerEntry' |
  'isBlockedConsumerOnUnackedMsgs' |
  'readPositionWhenJoining' |
  'address' |
  'connectedSince' |
  'clientVersion' |
  'lastAckedTimestamp' |
  'lastConsumedTimestamp' |
  'lastConsumedFlowTimestamp' |
  'keyHashRanges' |
  'metadata';

export type DataEntry = {
  msgRateOut?: number;
  msgThroughputOut?: number;
  bytesOutCounter?: number;
  msgOutCounter?: number;
  msgRateRedeliver?: number;
  messageAckRate?: number;
  chunkedMessageRate?: number;
  consumerName?: string;
  availablePermits?: number;
  unackedMessages?: number;
  avgMessagesPerEntry?: number;
  isBlockedConsumerOnUnackedMsgs?: boolean;
  readPositionWhenJoining?: string;
  address?: string;
  connectedSince?: Date;
  clientVersion?: string;
  lastAckedTimestamp?: Date;
  lastConsumedTimestamp?: Date;
  lastConsumedFlowTimestamp?: Date;
  keyHashRanges?: string[];
  metadata?: Record<string, string>;
}

export type ConsumersProps = {
  tenant: string;
  namespace: string;
  topic: string;
  topicType: "persistent" | "non-persistent";
  subscription: string;
};
const Consumers: React.FC<ConsumersProps> = (props) => {
  const { topicServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const i18n = I18n.useContext();

  const topicFqn = `${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`;

  const dataLoaderCacheKey = [`consumers-${topicFqn}`];
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

    const subscriptionsPb = pbUtils.mapToObject(stats.getSubscriptionsMap());
    const subscriptionPb = subscriptionsPb[props.subscription];
    if (subscriptionPb === undefined) {
      return [];
    }

    return dataEntriesFromPb(subscriptionPb);
  }

  return (
    <div className={s.Page}>
      <Table<ColumnKey, DataEntry, {}>
        columns={{
          help,
          columns: {
            address: {
              title: 'Address',
              render: (entry) => i18n.withVoidDefault(entry.address, v => v),
              sortFn: (a, b) => (a.data.address || '').localeCompare(b.data.address || ''),
            },
            availablePermits: {
              title: 'Available Permits',
              render: (entry) => i18n.withVoidDefault(entry.availablePermits, i18n.formatCount),
              sortFn: (a, b) => (a.data.availablePermits || 0) - (b.data.availablePermits || 0),
            },
            avgMessagesPerEntry: {
              title: 'Avg Messages Per Entry',
              render: (entry) => i18n.withVoidDefault(entry.avgMessagesPerEntry, v => v),
              sortFn: (a, b) => (a.data.avgMessagesPerEntry || 0) - (b.data.avgMessagesPerEntry || 0),
            },
            bytesOutCounter: {
              title: 'Bytes Out Counter',
              render: (entry) => i18n.withVoidDefault(entry.bytesOutCounter, i18n.formatBytes),
            },
            chunkedMessageRate: {
              title: 'Chunked Message Rate',
              render: (entry) => i18n.withVoidDefault(entry.chunkedMessageRate, i18n.formatCountRate),
              sortFn: (a, b) => (a.data.chunkedMessageRate || 0) - (b.data.chunkedMessageRate || 0),
            },
            clientVersion: {
              title: 'Client Version',
              render: (entry) => i18n.withVoidDefault(entry.clientVersion, v => v),
              sortFn: (a, b) => (a.data.clientVersion || '').localeCompare(b.data.clientVersion || ''),
            },
            connectedSince: {
              title: 'Connected Since',
              render: (entry) => i18n.withVoidDefault(entry.connectedSince, i18n.formatDateTime),
              sortFn: (a, b) => (a.data.connectedSince?.getTime() || 0) - (b.data.connectedSince?.getTime() || 0),
            },
            consumerName: {
              title: 'Name',
              render: (entry) => i18n.withVoidDefault(entry.consumerName, v => v),
              sortFn: (a, b) => (a.data.consumerName || '').localeCompare(b.data.consumerName || ''),
              filter: {
                descriptor: {
                  type: 'string',
                  defaultValue: { type: 'string', value: '' },
                },
                testFn: (de, _, filter) => {
                  if (filter.type !== 'string') {
                    return true;
                  }

                  return Boolean(de.consumerName?.toLowerCase().includes(filter.value.toLowerCase()))
                },
              }
            },
            isBlockedConsumerOnUnackedMsgs: {
              title: 'Is Blocked Consumer On Unacked Msgs',
              render: (entry) => i18n.withVoidDefault(entry.isBlockedConsumerOnUnackedMsgs, i18n.formatBoolean),
              sortFn: (a, b) => Number(a.data.isBlockedConsumerOnUnackedMsgs) - Number(b.data.isBlockedConsumerOnUnackedMsgs),
            },
            keyHashRanges: {
              title: 'Key Hash Ranges',
              render: (entry) => i18n.withVoidDefault(entry.keyHashRanges, v => v),
            },
            lastAckedTimestamp: {
              title: 'Last Acked Timestamp',
              render: (entry) => i18n.withVoidDefault(entry.lastAckedTimestamp, i18n.formatDateTime),
              sortFn: (a, b) => (a.data.lastAckedTimestamp?.getTime() || 0) - (b.data.lastAckedTimestamp?.getTime() || 0),
            },
            lastConsumedFlowTimestamp: {
              title: 'Last Consumed Flow Timestamp',
              render: (entry) => i18n.withVoidDefault(entry.lastConsumedFlowTimestamp, i18n.formatDateTime),
              sortFn: (a, b) => (a.data.lastConsumedFlowTimestamp?.getTime() || 0) - (b.data.lastConsumedFlowTimestamp?.getTime() || 0),
            },
            lastConsumedTimestamp: {
              title: 'Last Consumed Timestamp',
              render: (entry) => i18n.withVoidDefault(entry.lastConsumedTimestamp, i18n.formatDateTime),
              sortFn: (a, b) => (a.data.lastConsumedTimestamp?.getTime() || 0) - (b.data.lastConsumedTimestamp?.getTime() || 0),
            },
            messageAckRate: {
              title: 'Message Ack Rate',
              render: (entry) => i18n.withVoidDefault(entry.messageAckRate, i18n.formatCountRate),
              sortFn: (a, b) => (a.data.messageAckRate || 0) - (b.data.messageAckRate || 0),
            },
            metadata: {
              title: 'Metadata',
              render: (entry) => i18n.withVoidDefault(entry.metadata, v => JSON.stringify(v, null, 4)),
            },
            msgOutCounter: {
              title: 'Msg Out Counter',
              render: (entry) => i18n.withVoidDefault(entry.msgOutCounter, i18n.formatCount),
              sortFn: (a, b) => (a.data.msgOutCounter || 0) - (b.data.msgOutCounter || 0),
            },
            msgRateOut: {
              title: 'Msg Rate Out',
              render: (entry) => i18n.withVoidDefault(entry.msgRateOut, i18n.formatCountRate),
              sortFn: (a, b) => (a.data.msgRateOut || 0) - (b.data.msgRateOut || 0),
            },
            msgThroughputOut: {
              title: 'Msg Throughput Out',
              render: (entry) => i18n.withVoidDefault(entry.msgThroughputOut, i18n.formatBytesRate),
              sortFn: (a, b) => (a.data.msgThroughputOut || 0) - (b.data.msgThroughputOut || 0),
            },
            msgRateRedeliver: {
              title: 'Msg Rate Redeliver',
              render: (entry) => i18n.withVoidDefault(entry.msgRateRedeliver, i18n.formatCountRate),
              sortFn: (a, b) => (a.data.msgRateRedeliver || 0) - (b.data.msgRateRedeliver || 0),
            },
            readPositionWhenJoining: {
              title: 'Read Position When Joining',
              render: (entry) => i18n.withVoidDefault(entry.readPositionWhenJoining, v => v),
              sortFn: (a, b) => (a.data.readPositionWhenJoining || '').localeCompare(b.data.readPositionWhenJoining || ''),
            },
            unackedMessages: {
              title: 'Unacked Messages',
              render: (entry) => i18n.withVoidDefault(entry.unackedMessages, i18n.formatCount),
              sortFn: (a, b) => (a.data.unackedMessages || 0) - (b.data.unackedMessages || 0),
            }
          },
          defaultConfig: [
            { columnKey: 'consumerName', width: 300, visibility: 'visible', stickyTo: 'left' },
            { columnKey: 'msgRateOut', width: 100, visibility: 'visible' },
            { columnKey: 'msgThroughputOut', width: 100, visibility: 'visible' },
            { columnKey: 'bytesOutCounter', width: 100, visibility: 'visible' },
            { columnKey: 'msgRateRedeliver', width: 100, visibility: 'visible' },
            { columnKey: 'messageAckRate', width: 100, visibility: 'visible' },
            { columnKey: 'chunkedMessageRate', width: 100, visibility: 'visible' },
            { columnKey: 'availablePermits', width: 100, visibility: 'visible' },
            { columnKey: 'unackedMessages', width: 100, visibility: 'visible' },
            { columnKey: 'avgMessagesPerEntry', width: 100, visibility: 'visible' },
            { columnKey: 'isBlockedConsumerOnUnackedMsgs', width: 100, visibility: 'visible' },
            { columnKey: 'readPositionWhenJoining', width: 100, visibility: 'visible' },
            { columnKey: 'address', width: 200, visibility: 'visible' },
            { columnKey: 'connectedSince', width: 200, visibility: 'visible' },
            { columnKey: 'clientVersion', width: 200, visibility: 'visible' },
            { columnKey: 'lastAckedTimestamp', width: 200, visibility: 'visible' },
            { columnKey: 'lastConsumedTimestamp', width: 200, visibility: 'visible' },
            { columnKey: 'lastConsumedFlowTimestamp', width: 200, visibility: 'visible' },
            { columnKey: 'keyHashRanges', width: 200, visibility: 'visible' },
            { columnKey: 'metadata', width: 300, visibility: 'visible' },
          ],
        }}
        dataLoader={{
          cacheKey: dataLoaderCacheKey,
          loader: dataLoader
        }}
        autoRefresh={{
          intervalMs: 5000
        }}
        getId={(entry) => entry.consumerName?.toString() ?? ''}
        tableId='consumers-table'
        defaultSort={{ column: 'consumerName', direction: 'asc', type: 'by-single-column' }}
        defaultFiltersInUse={{
          consumerName: {
            state: 'active',
            value: { type: 'string', value: '' },
          }
        }}
      />
    </div>
  );
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

function dataEntriesFromPb(statsPb: pb.SubscriptionStats): DataEntry[] {
  return statsPb.getConsumersList().map((consumer) => {
    const connectedSince = new Date(consumer.getConnectedSince()?.getValue() || 0);
    const lastAckedTimestamp = new Date(consumer.getLastAckedTimestamp()?.getValue() || 0);
    const lastConsumedFlowTimestamp = new Date(consumer.getLastConsumedFlowTimestamp()?.getValue() || 0);
    const lastConsumedTimestamp = new Date(consumer.getLastConsumedTimestamp()?.getValue() || 0);

    const dataEntry: DataEntry = {
      address: consumer.getAddress()?.getValue(),
      connectedSince: connectedSince.getTime() === 0 ? undefined : connectedSince,
      availablePermits: consumer.getAvailablePermits()?.getValue(),
      avgMessagesPerEntry: consumer.getAvgMessagesPerEntry()?.getValue(),
      bytesOutCounter: consumer.getBytesOutCounter()?.getValue(),
      chunkedMessageRate: consumer.getChunkedMessageRate()?.getValue(),
      clientVersion: consumer.getClientVersion()?.getValue(),
      consumerName: consumer.getConsumerName()?.getValue(),
      isBlockedConsumerOnUnackedMsgs: consumer.getIsBlockedConsumerOnUnackedMsgs()?.getValue(),
      keyHashRanges: consumer.getKeyHashRangesList().map(v => v.getValue()),
      lastAckedTimestamp: lastAckedTimestamp.getTime() === 0 ? undefined : lastAckedTimestamp,
      lastConsumedFlowTimestamp: lastConsumedFlowTimestamp.getTime() === 0 ? undefined : lastConsumedFlowTimestamp,
      lastConsumedTimestamp: lastConsumedTimestamp.getTime() === 0 ? undefined : lastConsumedTimestamp,
      messageAckRate: consumer.getMessageAckRate()?.getValue(),
      metadata: pbUtils.mapToObject(consumer.getMetadataMap()),
      msgOutCounter: consumer.getMsgOutCounter()?.getValue(),
      msgRateOut: consumer.getMsgRateOut()?.getValue(),
      msgRateRedeliver: consumer.getMsgRateRedeliver()?.getValue(),
      msgThroughputOut: consumer.getMsgThroughputOut()?.getValue(),
      readPositionWhenJoining: consumer.getReadPositionWhenJoining()?.getValue(),
      unackedMessages: consumer.getUnackedMessages()?.getValue()
    }

    return dataEntry;
  });
}

export default Consumers;
