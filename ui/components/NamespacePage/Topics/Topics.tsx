import React from 'react';
import s from './Topics.module.css'
import * as GrpcClient from '../../app/contexts/GrpcClient/GrpcClient';
import * as pb from '../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb';
import * as Notifications from '../../app/contexts/Notifications';
import * as I18n from '../../app/contexts/I18n/I18n';
import { swrKeys } from '../../swrKeys';
import { Code } from '../../../grpc-web/google/rpc/code_pb';
import Table from '../../ui/Table/Table';
import { partition, uniq } from 'lodash';
import { help } from './help';
import Link from '../../ui/Link/Link';
import { routes } from '../../routes';
import * as pbUtils from '../../../pbUtils/pbUtils';
import {
  PartitionedTopicStats,
  TopicProperties,
  TopicStats
} from "../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb";

export type ColumnKey =
    'topicName' |
    'persistency' |
    'partitionsCount' |
    'producersCount' |
    'subscriptionsCount' |
    'consumersCount' |
    'msgRateIn' |
    'msgThroughputIn' |
    'msgRateOut' |
    'msgThroughputOut' |
    'bytesInCounter' |
    'msgInCounter' |
    'bytesOutCounter' |
    'msgOutCounter' |
    'averageMsgSize' |
    'isMsgChunkPublished' |
    'storageSize' |
    'backlogSize' |
    'earliestMsgPublishTimeInBacklogs' |
    'offloadedStorageSize' |
    'waitingPublishers' |
    'replicatorsCount' |
    'deduplicationStatus' |
    'topicEpoch' |
    'nonContiguousDeletedMessagesRanges' |
    'nonContiguousDeletedMessagesRangesSerializedSize' |
    'lastCompactionRemovedEventCount' |
    'lastCompactionSucceedTimestamp' |
    'lastCompactionFailedTimestamp' |
    'lastCompactionDurationTimeInMills' |
    'ownerBroker' |
    'delayedMessageIndexSizeInBytes' |
    'partitioning' |
    'properties';

type DataEntry = {
  fqn: string,
  name: string,
  partitioning: 'partitioned' | 'non-partitioned' | 'partition',
  persistency: 'persistent' | 'non-persistent',
}
type LazyDataEntry = {
  stats: pb.TopicStats,
  partitionedTopicMetadata?: pb.PartitionedTopicMetadata,
  properties?: pb.TopicProperties,
};

type TopicsProps = {
  tenant: string;
  namespace: string;
}

const Topics: React.FC<TopicsProps> = (props) => {
  const { topicServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const i18n = I18n.useContext();

  const dataLoaderCacheKey =
    swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics._({
      tenant: props.tenant,
      namespace: props.namespace
    }).concat(swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics._({
      tenant: props.tenant,
      namespace: props.namespace
    }));

  const dataLoader = async () => {
    const fetchPersistentTopics = async () => {
      const req = new pb.ListTopicsRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);
      req.setTopicDomain(pb.TopicDomain.TOPIC_DOMAIN_PERSISTENT);

      const res = await topicServiceClient.listTopics(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get persistent topics: ${res.getStatus()?.getMessage()}`);
        return;
      }

      return res.getTopicsList();
    }

    const fetchNonPersistentTopics = async () => {
      const req = new pb.ListTopicsRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);
      req.setTopicDomain(pb.TopicDomain.TOPIC_DOMAIN_NON_PERSISTENT);

      const res = await topicServiceClient.listTopics(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get non persistent topics: ${res.getStatus()?.getMessage()}`);
        return;
      }

      return res.getTopicsList();
    }

    const [persistentTopics, nonPersistentTopics] = await Promise.all([
      fetchPersistentTopics(),
      fetchNonPersistentTopics(),
    ]);

    const allTopics = (persistentTopics?.concat(nonPersistentTopics || []) || []);
    return makeTopicDataEntries(detectPartitionedTopics(allTopics || []));
  };

  const lazyDataLoader = async (entries: DataEntry[]) => {
    const topicsStatsRequest = new pb.GetTopicsStatsRequest();

    topicsStatsRequest.setIsGetPreciseBacklog(true);
    topicsStatsRequest.setIsEarliestTimeInBacklog(true);
    topicsStatsRequest.setIsSubscriptionBacklogSize(true);
    topicsStatsRequest.setIsPerPartition(false);

    const nonPartitionedTopics = entries.filter((entry) => entry.partitioning !== 'partitioned');
    topicsStatsRequest.setTopicsList(nonPartitionedTopics.map((entry) => entry.fqn));

    const partitionedTopics = entries.filter((entry) => entry.partitioning === 'partitioned');
    topicsStatsRequest.setPartitionedTopicsList(partitionedTopics.map((entry) => entry.fqn));

    const topicStatsResponse = await topicServiceClient.getTopicsStats(topicsStatsRequest, null)
      .catch((err) => notifyError(`Unable to get topics stats: ${err}`));


    if (topicStatsResponse === undefined) {
      return {};
    }

    if (topicStatsResponse.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to get topics stats: ${topicStatsResponse.getStatus()?.getMessage()}`);
      return {};
    }

    const topicPropertiesRequest = new pb.GetTopicPropertiesRequest();
    topicPropertiesRequest.setTopicsList(entries.map(value => value.fqn))

    const topicPropertiesResponse = await topicServiceClient.getTopicProperties(topicPropertiesRequest, null)
      .catch((err) => notifyError(`Unable to get topics properties: ${err}`));

    if (topicPropertiesResponse === undefined) {
      return {};
    }

    if (topicPropertiesResponse.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to get topics properties: ${topicPropertiesResponse.getStatus()?.getMessage()}`);
      return {};
    }

    return statsToLazyData(topicStatsResponse, topicPropertiesResponse);
  }

  const getConsumersCount = React.useCallback((topicStats: TopicStats) => {
        let consumersCount = 0;

        if (topicStats) {
            topicStats.getSubscriptionsMap().forEach((entry, _) => {
                consumersCount += entry.getConsumersList().length
            })
        } else {
            notifyError('Unable to count consumers count.');
        }

        return consumersCount;
    }, []);

  return (
    <div className={s.Topics}>
      <div className={s.Table}>
        <Table<ColumnKey, DataEntry, LazyDataEntry>
          itemNamePlural='topics'
          columns={{
            help,
            columns: {
              topicName: {
                title: 'Name',
                render: (de) => (
                  <Link
                    to={routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.messages._.get({
                      tenant: props.tenant,
                      namespace: props.namespace,
                      topic: de.name,
                      topicType: de.persistency,
                    })}
                  >
                    {de.name}
                  </Link>
                ),
                sortFn: (a, b) => a.data.name.localeCompare(b.data.name, 'en', { numeric: true }),
                filter: {
                  descriptor: {
                    type: 'string',
                    defaultValue: { type: 'string', value: '' }
                  },
                  testFn: (de, _, filterValue) => {
                    if (filterValue.type !== 'string') {
                      return true
                    }

                    return de.name.toLowerCase().includes(filterValue.value.toLowerCase());
                  },
                }
              },
              partitionsCount: {
                title: 'Partitions',
                isLazy: true,
                render: (_, ld) => i18n.withVoidDefault(ld?.partitionedTopicMetadata?.getPartitions()?.getValue(), v => v),
              },
              producersCount: {
                title: 'Producers',
                isLazy: true,
                render: (de, ld) => i18n.withVoidDefault(ld?.stats.getPublishersList()?.length, v => (
                  <Link
                    to={routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.producers._.get({
                      tenant: props.tenant,
                      namespace: props.namespace,
                      topic: de.name,
                      topicType: de.persistency,
                    })}
                  >
                    {v}
                  </Link>
                )),
              },
              subscriptionsCount: {
                title: 'Subscriptions',
                isLazy: true,
                render: (de, ld) => i18n.withVoidDefault(ld?.stats.getSubscriptionsMap()?.getLength(), v => (
                  <Link
                    to={routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.subscriptions._.get({
                      tenant: props.tenant,
                      namespace: props.namespace,
                      topic: de.name,
                      topicType: de.persistency,
                    })}
                  >
                    {v}
                  </Link>
                )),
              },
              consumersCount: {
                  title: 'Consumers',
                  isLazy: true,
                  render: (de, ld) => i18n.withVoidDefault(ld ? getConsumersCount(ld?.stats) : 0, v => v),
              },
              persistency: {
                title: 'Persistency',
                render: (de) => de.persistency,
                filter: {
                  descriptor: {
                    type: 'singleOption',
                    options: [
                      { value: 'all', label: 'All' },
                      { value: 'persistent', label: 'Persistent' },
                      { value: 'non-persistent', label: 'Non-Persistent' },
                    ],
                    defaultValue: { type: 'singleOption', value: 'all' }
                  },
                  testFn: (de, _, filterValue) => {
                    if (filterValue.type !== 'singleOption') {
                      return true
                    }

                    let result = true;
                    switch (filterValue.value) {
                      case 'persistent':
                        result = de.persistency === 'persistent';
                        break;
                      case 'non-persistent':
                        result = de.persistency === 'non-persistent';
                        break;
                    }

                    return result;
                  },
                }
              },
              partitioning: {
                title: 'Partitioning',
                render: (de) => de.partitioning,
                sortFn: (a, b) => a.data.partitioning.localeCompare(b.data.partitioning),
                filter: {
                  descriptor: {
                    type: 'singleOption',
                    options: [{ value: 'show-partitions', label: 'Show Partitions' }, { value: 'hide-partitions', label: 'Hide Partitions' }],
                    defaultValue: { type: 'singleOption', value: 'hide-partitions' },
                  },
                  testFn: (de, _, filterValue) => {
                    if (filterValue.type !== 'singleOption') {
                      return true
                    }

                    let result = true;
                    switch (filterValue.value) {
                      case 'hide-partitions':
                        result = de.partitioning !== 'partition';
                        break;
                      case 'all':
                        result = true;
                    }

                    return result;
                  },
                }
              },
              msgRateIn: {
                title: 'Msg Rate In',
                isLazy: true,
                render: (_, ld) => i18n.withVoidDefault(ld?.stats.getMsgRateIn()?.getValue(), i18n.formatCountRate),
              },
              msgThroughputIn: {
                title: 'Msg Throughput In',
                isLazy: true,
                render: (_, ld) => i18n.withVoidDefault(ld?.stats.getMsgThroughputIn()?.getValue(), i18n.formatBytesRate),
              },
              msgRateOut: {
                title: 'Msg Rate Out',
                isLazy: true,
                render: (_, ld) => i18n.withVoidDefault(ld?.stats.getMsgRateOut()?.getValue(), i18n.formatCountRate),
              },
              msgThroughputOut: {
                title: 'Msg Throughput Out',
                isLazy: true,
                render: (_, ld) => i18n.withVoidDefault(ld?.stats.getMsgThroughputOut()?.getValue(), i18n.formatBytesRate),
              },
              bytesInCounter: {
                title: 'Bytes In Counter',
                isLazy: true,
                render: (_, ld) => i18n.withVoidDefault(ld?.stats.getBytesInCounter()?.getValue(), i18n.formatBytes),
              },
              msgInCounter: {
                title: 'Msg In Counter',
                isLazy: true,
                render: (_, ld) => i18n.withVoidDefault(ld?.stats.getMsgInCounter()?.getValue(), i18n.formatCount),
              },
              bytesOutCounter: {
                title: 'Bytes Out Counter',
                isLazy: true,
                render: (_, ld) => i18n.withVoidDefault(ld?.stats.getBytesOutCounter()?.getValue(), i18n.formatBytes),
              },
              msgOutCounter: {
                title: 'Msg Out Counter',
                isLazy: true,
                render: (_, ld) => i18n.withVoidDefault(ld?.stats.getMsgOutCounter()?.getValue(), i18n.formatCount),
              },
              averageMsgSize: {
                title: 'Average Msg Size',
                isLazy: true,
                render: (_, ld) => i18n.withVoidDefault(ld?.stats.getAverageMsgSize()?.getValue(), i18n.formatBytes),
              },
              isMsgChunkPublished: {
                title: 'Is Msg Chunk Published',
                isLazy: true,
                render: (_, ld) => i18n.withVoidDefault(ld?.stats.getIsMsgChunkPublished()?.getValue(), i18n.formatBoolean),
              },
              storageSize: {
                title: 'Storage Size',
                isLazy: true,
                render: (_, ld) => i18n.withVoidDefault(ld?.stats.getStorageSize()?.getValue(), i18n.formatBytes),
              },
              backlogSize: {
                title: 'Backlog Size',
                isLazy: true,
                render: (_, ld) => i18n.withVoidDefault(ld?.stats.getBacklogSize()?.getValue(), i18n.formatBytes),
              },
              earliestMsgPublishTimeInBacklogs: {
                title: 'Earliest Msg Publish Time In Backlogs',
                isLazy: true,
                render: (_, ld) => i18n.withVoidDefault(ld?.stats.getEarliestMsgPublishTimeInBacklogs()?.getValue() || undefined, (v) => i18n.formatDateTime(new Date(v))),
              },
              offloadedStorageSize: {
                title: 'Offloaded Storage Size',
                isLazy: true,
                render: (_, ld) => i18n.withVoidDefault(ld?.stats.getOffloadedStorageSize()?.getValue(), i18n.formatBytes),
              },
              waitingPublishers: {
                title: 'Waiting Publishers',
                isLazy: true,
                render: (_, ld) => i18n.withVoidDefault(ld?.stats.getWaitingPublishers()?.getValue(), v => v),
              },
              replicatorsCount: {
                title: 'Replicators',
                isLazy: true,
                render: (_, ld) => i18n.withVoidDefault(ld?.stats.getReplicationMap()?.getLength(), v => v),
              },
              deduplicationStatus: {
                title: 'Deduplication Status',
                isLazy: true,
                render: (_, ld) => i18n.withVoidDefault(ld?.stats.getDeduplicationStatus()?.getValue(), v => v),
              },
              topicEpoch: {
                title: 'Topic Epoch',
                isLazy: true,
                render: (_, ld) => i18n.withVoidDefault(ld?.stats.getTopicEpoch()?.getValue(), v => v),
              },
              nonContiguousDeletedMessagesRanges: {
                title: 'Non Contiguous Deleted Messages Ranges',
                isLazy: true,
                render: (_, ld) => i18n.withVoidDefault(ld?.stats.getNonContiguousDeletedMessagesRanges()?.getValue(), v => v),
              },
              nonContiguousDeletedMessagesRangesSerializedSize: {
                title: 'Non Contiguous Deleted Messages Ranges Serialized Size',
                isLazy: true,
                render: (_, ld) => i18n.withVoidDefault(ld?.stats.getNonContiguousDeletedMessagesRangesSerializedSize()?.getValue(), i18n.formatBytes),
              },
              lastCompactionRemovedEventCount: {
                title: 'Last Compaction Removed Event Count',
                isLazy: true,
                render: (_, ld) => i18n.withVoidDefault(ld?.stats.getCompaction()?.getLastCompactionRemovedEventCount()?.getValue(), v => v.toString()),
              },
              lastCompactionSucceedTimestamp: {
                title: 'Last Compaction Succeed Timestamp',
                isLazy: true,
                render: (_, ld) => i18n.withVoidDefault(ld?.stats.getCompaction()?.getLastCompactionSucceedTimestamp()?.getValue() || undefined, (v) => i18n.formatDateTime(new Date(v))),
              },
              lastCompactionFailedTimestamp: {
                title: 'Last Compaction Failed Timestamp',
                isLazy: true,
                render: (_, ld) => i18n.withVoidDefault(ld?.stats.getCompaction()?.getLastCompactionFailedTimestamp()?.getValue() || undefined, (v) => i18n.formatDateTime(new Date(v))),
              },
              lastCompactionDurationTimeInMills: {
                title: 'Last Compaction Duration Time',
                isLazy: true,
                render: (_, ld) => i18n.withVoidDefault(ld?.stats.getCompaction()?.getLastCompactionDurationTimeInMills()?.getValue() || undefined, i18n.formatDuration),
              },
              ownerBroker: {
                title: 'Owner Broker',
                isLazy: true,
                render: (_, ld) => i18n.withVoidDefault(ld?.stats.getOwnerBroker()?.getValue(), v => v.toString()),
              },
              delayedMessageIndexSizeInBytes: {
                title: 'Delayed Message Index Size In Bytes',
                isLazy: true,
                render: (_, ld) => i18n.withVoidDefault(ld?.stats.getDelayedMessageIndexSizeInBytes()?.getValue(), i18n.formatBytes),
              },
              properties: {
                title: 'Properties',
                isLazy: true,
                render: (_, ld) => ld?.properties?.getPropertiesMap() && i18n.withVoidDefault(pbUtils.mapToObject(ld?.properties?.getPropertiesMap()), v => JSON.stringify(v)),
              },
            },
            defaultConfig: [
              { columnKey: 'topicName', visibility: 'visible', stickyTo: 'left', width: 200 },
              { columnKey: 'persistency', visibility: 'visible', width: 90 },
              { columnKey: 'partitionsCount', visibility: 'visible', width: 60 },
              { columnKey: 'subscriptionsCount', visibility: 'visible', width: 100 },
              { columnKey: 'producersCount', visibility: 'visible', width: 100 },
              { columnKey: 'consumersCount', visibility: 'visible', width: 100},
              { columnKey: 'msgRateIn', visibility: 'visible', width: 100 },
              { columnKey: 'msgRateOut', visibility: 'visible', width: 100 },
              { columnKey: 'msgThroughputIn', visibility: 'visible', width: 100 },
              { columnKey: 'msgThroughputOut', visibility: 'visible', width: 100 },
              { columnKey: 'storageSize', visibility: 'visible', width: 100 },
              { columnKey: 'backlogSize', visibility: 'visible', width: 100 },
              { columnKey: 'bytesInCounter', visibility: 'visible', width: 100 },
              { columnKey: 'bytesOutCounter', visibility: 'visible', width: 100 },
              { columnKey: 'msgInCounter', visibility: 'visible', width: 100 },
              { columnKey: 'msgOutCounter', visibility: 'visible', width: 100 },
              { columnKey: 'averageMsgSize', visibility: 'visible', width: 100 },
              { columnKey: 'isMsgChunkPublished', visibility: 'visible', width: 100 },
              { columnKey: 'earliestMsgPublishTimeInBacklogs', visibility: 'visible', width: 200 },

              { columnKey: 'offloadedStorageSize', visibility: 'visible', width: 100 },
              { columnKey: 'waitingPublishers', visibility: 'visible', width: 100 },
              { columnKey: 'replicatorsCount', visibility: 'visible', width: 100 },
              { columnKey: 'deduplicationStatus', visibility: 'visible', width: 100 },
              { columnKey: 'topicEpoch', visibility: 'visible', width: 100 },
              { columnKey: 'nonContiguousDeletedMessagesRanges', visibility: 'visible', width: 100 },
              { columnKey: 'nonContiguousDeletedMessagesRangesSerializedSize', visibility: 'visible', width: 100 },
              { columnKey: 'lastCompactionRemovedEventCount', visibility: 'visible', width: 100 },
              { columnKey: 'lastCompactionSucceedTimestamp', visibility: 'visible', width: 200 },
              { columnKey: 'lastCompactionFailedTimestamp', visibility: 'visible', width: 200 },
              { columnKey: 'lastCompactionDurationTimeInMills', visibility: 'visible', width: 100 },
              { columnKey: 'ownerBroker', visibility: 'visible', width: 100 },
              { columnKey: 'delayedMessageIndexSizeInBytes', visibility: 'visible', width: 100 },
              { columnKey: 'partitioning', visibility: 'visible', width: 100 },
              { columnKey: 'properties', visibility: 'visible', width: 100 },
            ]
          }}
          autoRefresh={{
            intervalMs: 5000
          }}
          getId={(d) => d.fqn}
          tableId='topics-table'
          defaultSort={{ type: 'by-single-column', column: 'topicName', direction: 'asc' }}
          defaultFiltersInUse={{
            'topicName': {
              state: 'active',
              value: { 'type': 'string', value: '' }
            },
            'persistency': {
              state: 'active',
              value: { 'type': 'singleOption', value: 'all' }
            },
            'partitioning': {
              state: 'active',
              value: { 'type': 'singleOption', value: 'hide-partitions' }
            }
          }}
          dataLoader={{
            cacheKey: dataLoaderCacheKey,
            loader: dataLoader
          }}
          lazyDataLoader={{
            loader: lazyDataLoader
          }}
        />

      </div>
    </div>
  );
}

type DetectPartitionedTopicsResult = {
  partitionedTopics: { topicFqn: string, partitions: string[] }[],
  nonPartitionedTopics: { topicFqn: string }[]
};

function detectPartitionedTopics(topics: string[]): DetectPartitionedTopicsResult {
  let [allPartitions, nonPartitionedTopicFqns] = partition(topics, (topic) => topic.match(/^(.*)(-partition-)(\d+)$/));

  const nonPartitionedTopics = nonPartitionedTopicFqns.map((topicFqn) => ({ topicFqn }));

  const partitionedTopicFqns = uniq(allPartitions.map((partition) => partition.replace(/^(.*)(-partition-)(\d+)$/, '$1')));
  const partitionedTopics = partitionedTopicFqns.map((topicFqn) => {
    const regexp = new RegExp(`^${topicFqn}-partition-\\d+$`);
    const partitions = allPartitions.filter(p => regexp.test(p));
    return { topicFqn, partitions };
  });


  return { partitionedTopics, nonPartitionedTopics };
}

function detectPersistenceType(topicFqn: string): 'persistent' | 'non-persistent' {
  return topicFqn.startsWith('non-persistent') ? 'non-persistent' : 'persistent';
}

function getTopicName(topicFqn: string): string {
  return topicFqn.split('/')[4];
}

function makeTopicDataEntries(topics: DetectPartitionedTopicsResult): DataEntry[] {
  let result: DataEntry[] = [];

  for (const topic of topics.nonPartitionedTopics) {
    result.push({
      fqn: topic.topicFqn,
      name: getTopicName(topic.topicFqn),
      partitioning: 'non-partitioned',
      persistency: detectPersistenceType(topic.topicFqn),
    });
  }

  for (const topic of topics.partitionedTopics) {
    result.push(
      {
        fqn: topic.topicFqn,
        name: getTopicName(topic.topicFqn),
        partitioning: 'partitioned',
        persistency: detectPersistenceType(topic.topicFqn)
      }
    );

    for (const partitionFqn of topic.partitions) {
      result.push(
        {
          fqn: partitionFqn,
          name: getTopicName(partitionFqn),
          partitioning: 'partition',
          persistency: detectPersistenceType(partitionFqn)
        }
      );
    }
  }

  return result;
}

type PartitionedTopicsStatsWithProperties = Record<string, { stats: PartitionedTopicStats, properties: TopicProperties }>;
type NonPartitionedTopicsStatsWithProperties = Record<string, { stats: TopicStats, properties: TopicProperties }>;

function statsToLazyData(statsResponse: pb.GetTopicsStatsResponse, propertiesResponse: pb.GetTopicPropertiesResponse): Record<string, LazyDataEntry> {
  let result: Record<string, LazyDataEntry> = {};

  const properties = pbUtils.mapToObject(propertiesResponse.getTopicPropertiesMap());
  const nonPartitionedStats = pbUtils.mapToObject(statsResponse.getTopicStatsMap());
  const partitionedStats = pbUtils.mapToObject(statsResponse.getPartitionedTopicStatsMap());

  let combinedNonPartitionedStats: NonPartitionedTopicsStatsWithProperties = {};
  let combinedPartitionedStats: PartitionedTopicsStatsWithProperties = {};


  for (let nonPartitionedTopicFqn in nonPartitionedStats) {
    combinedNonPartitionedStats[nonPartitionedTopicFqn] = {
      stats: nonPartitionedStats[nonPartitionedTopicFqn],
      properties: properties[nonPartitionedTopicFqn]
    };
  }

  for (let partitionedTopicFqn in partitionedStats) {
    combinedPartitionedStats[partitionedTopicFqn] = {
      stats: partitionedStats[partitionedTopicFqn],
      properties: properties[partitionedTopicFqn]
    };
  }

  Object.entries(combinedNonPartitionedStats).forEach(([topicFqn, stats]) => {
    result[topicFqn] = { stats: stats.stats, properties: stats.properties };
  });

  Object.entries(combinedPartitionedStats).forEach(([topicFqn, partitionedTopicStats]) => {
    const stats = partitionedTopicStats.stats.getStats();
    const partitionedTopicMetadata = partitionedTopicStats.stats.getMetadata();

    if (stats !== undefined) {
      result[topicFqn] = {
        stats: stats,
        partitionedTopicMetadata: partitionedTopicMetadata,
        properties: partitionedTopicStats.properties
      };
    }
  });

  return result;
}

export default Topics;
