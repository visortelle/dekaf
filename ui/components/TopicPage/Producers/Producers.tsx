import React from 'react';
import s from './Producers.module.css'
import * as GrpcClient from '../../app/contexts/GrpcClient/GrpcClient';
import * as Notifications from '../../app/contexts/Notifications';
import * as I18n from '../../app/contexts/I18n/I18n';
import useSWR from 'swr';
import * as pb from '../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb';
import Table from '../../ui/Table/Table';
import { help } from './help';

export type ColumnKey =
  'producerName' |
  'producerId' |
  'accessMode' |
  'msgRateIn' |
  'msgThroughputIn' |
  'averageMsgSize' |
  'chunkedMessageRate' |
  'isSupportsPartialProducer' |
  'address' |
  'connectedSince' |
  'clientVersion' |
  'metadata';

export type DataEntry = {
  accessMode?: string;
  msgRateIn?: number;
  msgThroughputIn?: number;
  averageMsgSize?: number;
  chunkedMessageRate?: number;
  producerId?: number;
  isSupportsPartialProducer?: boolean;
  producerName?: string;
  address?: string;
  connectedSince?: Date;
  clientVersion?: string;
  metadata?: Record<string, string>;
}

export type ProducersProps = {
  tenant: string;
  namespace: string;
  topic: string;
  topicType: "persistent" | "non-persistent";
};
const Producers: React.FC<ProducersProps> = (props) => {
  const { topicServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const i18n = I18n.useContext();

  const topicFqn = `${props.topicType}://${props.tenant}/${props.namespace}/${props.topic}`;

  const dataLoaderCacheKey = [`producers-${topicFqn}`];
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
    <div className={s.Page}>
      <Table<ColumnKey, DataEntry, {}>
        columns={{
          help,
          columns: {
            accessMode: {
              title: 'Access Mode',
              render: (entry) => entry.accessMode,
              sortFn: (a, b) => (a.data.accessMode || '').localeCompare(b.data.accessMode || ''),
            },
            msgRateIn: {
              title: 'Msg Rate In',
              render: (de) => i18n.withVoidDefault(de.msgRateIn, i18n.formatCountRate),
              sortFn: (a, b) => (a.data.msgRateIn || 0) - (b.data.msgRateIn || 0),
            },
            msgThroughputIn: {
              title: 'Msg Throughput In',
              render: (de) => i18n.withVoidDefault(de.msgThroughputIn, i18n.formatBytesRate),
              sortFn: (a, b) => (a.data.msgThroughputIn || 0) - (b.data.msgThroughputIn || 0),
            },
            averageMsgSize: {
              title: 'Average Msg Size',
              render: (de) => i18n.withVoidDefault(de.averageMsgSize, i18n.formatBytes),
              sortFn: (a, b) => (a.data.averageMsgSize || 0) - (b.data.averageMsgSize || 0),
            },
            chunkedMessageRate: {
              title: 'Chunked Message Rate',
              render: (de) => i18n.withVoidDefault(de.chunkedMessageRate, i18n.formatCountRate),
              sortFn: (a, b) => (a.data.chunkedMessageRate || 0) - (b.data.chunkedMessageRate || 0),
            },
            producerId: {
              title: 'Producer Id',
              render: (entry) => entry.producerId,
              sortFn: (a, b) => (a.data.producerId || 0) - (b.data.producerId || 0),
            },
            isSupportsPartialProducer: {
              title: 'Is Supports Partial Producer',
              render: (de) => i18n.withVoidDefault(de.isSupportsPartialProducer, i18n.formatBoolean),
              sortFn: (a, b) => Number(a.data.isSupportsPartialProducer) - Number(b.data.isSupportsPartialProducer),
            },
            producerName: {
              title: 'Name',
              render: (entry) => entry.producerName,
              sortFn: (a, b) => (a.data.producerName || '').localeCompare(b.data.producerName || ''),
            },
            address: {
              title: 'Address',
              render: (entry) => entry.address,
              sortFn: (a, b) => (a.data.address || '').localeCompare(b.data.address || ''),
            },
            connectedSince: {
              title: 'Connected Since',
              render: (de) => i18n.withVoidDefault(de.connectedSince, i18n.formatDateTime),
              sortFn: (a, b) => (a.data.connectedSince?.getTime() || 0) - (b.data.connectedSince?.getTime() || 0),
            },
            clientVersion: {
              title: 'Client Version',
              render: (entry) => entry.clientVersion,
              sortFn: (a, b) => (a.data.clientVersion || '').localeCompare(b.data.clientVersion || ''),
            },
            metadata: {
              title: 'Metadata',
              render: (entry) => JSON.stringify(entry.metadata, null, 4),
            }
          },
          defaultConfig: [
            { columnKey: 'producerName', width: 350, visibility: 'visible', stickyTo: 'left' },
            { columnKey: 'accessMode', width: 100, visibility: 'visible' },
            { columnKey: 'msgRateIn', width: 100, visibility: 'visible' },
            { columnKey: 'msgThroughputIn', width: 140, visibility: 'visible' },
            { columnKey: 'averageMsgSize', width: 130, visibility: 'visible' },
            { columnKey: 'chunkedMessageRate', width: 160, visibility: 'visible' },
            { columnKey: 'isSupportsPartialProducer', width: 200, visibility: 'visible' },
            { columnKey: 'producerId', width: 100, visibility: 'visible' },
            { columnKey: 'address', width: 200, visibility: 'visible' },
            { columnKey: 'connectedSince', width: 200, visibility: 'visible' },
            { columnKey: 'clientVersion', width: 200, visibility: 'visible' },
            { columnKey: 'metadata', width: 200, visibility: 'visible' },
          ],
        }}
        dataLoader={{
          cacheKey: dataLoaderCacheKey,
          loader: dataLoader
        }}
        autoRefresh={{
          intervalMs: 5000
        }}
        getId={(entry) => entry.producerName?.toString() ?? ''}
        tableId='producers-table'
        defaultSort={{ column: 'producerName', direction: 'asc', type: 'by-single-column' }}
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

function dataEntriesFromPb(statsPb: pb.TopicStats): DataEntry[] {
  function producerAccessModeToString(accessMode: pb.ProducerAccessMode): string {
    switch (accessMode) {
      case pb.ProducerAccessMode.PRODUCER_ACCESS_MODE_SHARED:
        return 'Shared';
      case pb.ProducerAccessMode.PRODUCER_ACCESS_MODE_EXCLUSIVE:
        return 'Exclusive';
      case pb.ProducerAccessMode.PRODUCER_ACCESS_MODE_EXCLUSIVE_WITH_FENCING:
        return 'Exclusive with fencing';
      case pb.ProducerAccessMode.PRODUCER_ACCESS_MODE_WAIT_FOR_EXCLUSIVE:
        return 'Wait for exclusive';
      default:
        return 'Unknown';
    }
  }

  return statsPb.getPublishersList().map((publisher) => {
    const connectedSince = publisher.getConnectedSince()?.getValue();
    const dataEntry: DataEntry = {
      accessMode: producerAccessModeToString(publisher.getAccessMode()),
      address: publisher.getAddress()?.getValue(),
      averageMsgSize: publisher.getAverageMsgSize()?.getValue(),
      chunkedMessageRate: publisher.getChunkedMessageRate()?.getValue(),
      clientVersion: publisher.getClientVersion()?.getValue(),
      connectedSince: connectedSince === undefined ? undefined : new Date(connectedSince),
      isSupportsPartialProducer: publisher.getIsSupportsPartialProducer()?.getValue(),
      metadata: Object.fromEntries(publisher.getMetadataMap().toObject()),
      msgRateIn: publisher.getMsgRateIn()?.getValue(),
      msgThroughputIn: publisher.getMsgThroughputIn()?.getValue(),
      producerId: publisher.getProducerId()?.getValue(),
      producerName: publisher.getProducerName()?.getValue(),
    }

    return dataEntry;
  });
}

export default Producers;
