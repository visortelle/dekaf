import React, { useState } from 'react';
import s from './Topics.module.css'
import * as GrpcClient from '../../app/contexts/GrpcClient/GrpcClient';
import * as pb from '../../../grpc-web/tools/teal/pulsar/ui/topic/v1/topic_pb';
import * as Notifications from '../../app/contexts/Notifications';
import * as I18n from '../../app/contexts/I18n/I18n';
import useSWR from 'swr';
import { swrKeys } from '../../swrKeys';
import Input from '../../ui/Input/Input';
import { useDebounce } from 'use-debounce';
import { Code } from '../../../grpc-web/google/rpc/code_pb';
import Table from '../../ui/Table/Table';
import { partition, uniq } from 'lodash';
import * as pbUtils from '../../../pbUtils/pbUtils';
import { help } from './help';
import Link from '../../ui/Link/Link';
import { routes } from '../../routes';

export type ColumnKey =
  'topicName' |
  'topicType' |
  'producersCount' |
  'subscriptionsCount' |
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
  'delayedMessageIndexSizeInBytes';

type DataEntry = {
  fqn: string,
  name: string,
  partitioningType: 'partitioned' | 'non-partitioned' | 'partition',
  persistencyType: 'persistent' | 'non-persistent',
}
type LazyDataEntry = {
  stats: pb.TopicStats,
};

type TopicsProps = {
  tenant: string;
  namespace: string;
}

const Topics: React.FC<TopicsProps> = (props) => {
  const { topicServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const [filterQuery, setFilterQuery] = useState('');
  const [filterQueryDebounced] = useDebounce(filterQuery, 400);
  const i18n = I18n.useContext();

  const { data: persistentTopics, error: persistentTopicsError } = useSWR(
    swrKeys.pulsar.tenants.tenant.namespaces.namespace.persistentTopics._({ tenant: props.tenant, namespace: props.namespace }),
    async () => {
      const req = new pb.GetTopicsRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);
      req.setTopicDomain(pb.TopicDomain.TOPIC_DOMAIN_PERSISTENT);

      const res = await topicServiceClient.getTopics(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get persistent topics: ${res.getStatus()?.getMessage()}`);
        return;
      }

      return res.getTopicsList();
    }
  );
  if (persistentTopicsError) {
    notifyError(`Unable to get persistent topics: ${persistentTopicsError}`);
  }

  const { data: nonPersistentTopics, error: nonPersistentTopicsError } = useSWR(
    swrKeys.pulsar.tenants.tenant.namespaces.namespace.nonPersistentTopics._({ tenant: props.tenant, namespace: props.namespace }),
    async () => {
      const req = new pb.GetTopicsRequest();
      req.setNamespace(`${props.tenant}/${props.namespace}`);
      req.setTopicDomain(pb.TopicDomain.TOPIC_DOMAIN_NON_PERSISTENT);

      const res = await topicServiceClient.getTopics(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to get non persistent topics: ${res.getStatus()?.getMessage()}`);
        return;
      }

      return res.getTopicsList();
    }
  );
  if (persistentTopicsError) {
    notifyError(`Unable to get persistent topics list. ${nonPersistentTopicsError}`);
  }

  const allTopics = (persistentTopics?.concat(nonPersistentTopics || []) || []);

  let topicsToShow = makeTopicDataEntries(detectPartitionedTopics(allTopics || []));
  topicsToShow = topicsToShow?.filter((t) => t.name.includes(filterQueryDebounced));

  return (
    <div className={s.Topics}>
      <div className={s.Toolbar}>
        <div className={s.FilterInput}>
          <Input value={filterQuery} onChange={(v) => setFilterQuery(v)} placeholder="topic-name" focusOnMount={true} clearable={true} />
        </div>
        <div>
          <strong>{topicsToShow.length}</strong> <span style={{ fontWeight: 'normal' }}>of</span> <strong>{topicsToShow.length}</strong> topics.
        </div>
      </div>

      <Table<ColumnKey, DataEntry, LazyDataEntry>
        columns={{
          help,
          columns: {
            topicName: {
              title: 'Topic Name',
              render: (de) => (
                <Link
                  to={routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.overview._.get({
                    tenant: props.tenant,
                    namespace: props.namespace,
                    topic: de.name,
                    topicType: de.persistencyType,
                  })}
                >
                  {de.name}
                </Link>
              ),
              sortFn: (a, b) => a.data.name.localeCompare(b.data.name),
            },
            producersCount: {
              title: 'Producers',
              render: (de, ld) => i18n.withVoidDefault(ld?.stats.getPublishersList()?.length, v => (
                <Link
                  to={routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.producers._.get({
                    tenant: props.tenant,
                    namespace: props.namespace,
                    topic: de.name,
                    topicType: de.persistencyType,
                  })}
                >
                  {v}
                </Link>
              )),
            },
            subscriptionsCount: {
              title: 'Subscriptions',
              render: (de, ld) => i18n.withVoidDefault(ld?.stats.getSubscriptionsMap()?.getLength(), v => (
                <Link
                  to={routes.tenants.tenant.namespaces.namespace.topics.anyTopicType.topic.subscriptions._.get({
                    tenant: props.tenant,
                    namespace: props.namespace,
                    topic: de.name,
                    topicType: de.persistencyType,
                  })}
                >
                  {v}
                </Link>
              )),
            },
            topicType: {
              title: 'Type',
              render: (de) => de.persistencyType,
            },
            msgRateIn: {
              title: 'Msg Rate In',
              render: (_, ld) => i18n.withVoidDefault(ld?.stats.getMsgRateIn()?.getValue(), i18n.formatCountRate),
            },
            msgThroughputIn: {
              title: 'Msg Throughput In',
              render: (_, ld) => i18n.withVoidDefault(ld?.stats.getMsgThroughputIn()?.getValue(), i18n.formatBytesRate),
            },
            msgRateOut: {
              title: 'Msg Rate Out',
              render: (_, ld) => i18n.withVoidDefault(ld?.stats.getMsgRateOut()?.getValue(), i18n.formatCountRate),
            },
            msgThroughputOut: {
              title: 'Msg Throughput Out',
              render: (_, ld) => i18n.withVoidDefault(ld?.stats.getMsgThroughputOut()?.getValue(), i18n.formatBytesRate),
            },
            bytesInCounter: {
              title: 'Bytes In Counter',
              render: (_, ld) => i18n.withVoidDefault(ld?.stats.getBytesInCounter()?.getValue(), i18n.formatBytes),
            },
            msgInCounter: {
              title: 'Msg In Counter',
              render: (_, ld) => i18n.withVoidDefault(ld?.stats.getMsgInCounter()?.getValue(), i18n.formatCount),
            },
            bytesOutCounter: {
              title: 'Bytes Out Counter',
              render: (_, ld) => i18n.withVoidDefault(ld?.stats.getBytesOutCounter()?.getValue(), i18n.formatBytes),
            },
            msgOutCounter: {
              title: 'Msg Out Counter',
              render: (_, ld) => i18n.withVoidDefault(ld?.stats.getMsgOutCounter()?.getValue(), i18n.formatCount),
            },
            averageMsgSize: {
              title: 'Average Msg Size',
              render: (_, ld) => i18n.withVoidDefault(ld?.stats.getAverageMsgSize()?.getValue(), i18n.formatBytes),
            },
            isMsgChunkPublished: {
              title: 'Is Msg Chunk Published',
              render: (_, ld) => i18n.withVoidDefault(ld?.stats.getIsMsgChunkPublished()?.getValue(), i18n.formatBoolean),
            },
            storageSize: {
              title: 'Storage Size',
              render: (_, ld) => i18n.withVoidDefault(ld?.stats.getStorageSize()?.getValue(), i18n.formatBytes),
            },
            backlogSize: {
              title: 'Backlog Size',
              render: (_, ld) => i18n.withVoidDefault(ld?.stats.getBacklogSize()?.getValue(), i18n.formatBytes),
            },
            earliestMsgPublishTimeInBacklogs: {
              title: 'Earliest Msg Publish Time In Backlogs',
              render: (_, ld) => i18n.withVoidDefault(ld?.stats.getEarliestMsgPublishTimeInBacklogs()?.getValue() || undefined, (v) => i18n.formatDate(new Date(v))),
            },
            offloadedStorageSize: {
              title: 'Offloaded Storage Size',
              render: (_, ld) => i18n.withVoidDefault(ld?.stats.getOffloadedStorageSize()?.getValue(), i18n.formatBytes),
            },
            waitingPublishers: {
              title: 'Waiting Publishers',
              render: (_, ld) => i18n.withVoidDefault(ld?.stats.getWaitingPublishers()?.getValue(), v => v.toString()),
            },
            replicatorsCount: {
              title: 'Replicators',
              render: (_, ld) => i18n.withVoidDefault(ld?.stats.getReplicationMap()?.getLength(), v => v.toString()),
            },
            deduplicationStatus: {
              title: 'Deduplication Status',
              render: (_, ld) => i18n.withVoidDefault(ld?.stats.getDeduplicationStatus()?.getValue(), v => v),
            },
            topicEpoch: {
              title: 'Topic Epoch',
              render: (_, ld) => i18n.withVoidDefault(ld?.stats.getTopicEpoch()?.getValue(), v => v.toString()),
            },
            nonContiguousDeletedMessagesRanges: {
              title: 'Non Contiguous Deleted Messages Ranges',
              render: (_, ld) => i18n.withVoidDefault(ld?.stats.getNonContiguousDeletedMessagesRanges()?.getValue(), v => v.toString()),
            },
            nonContiguousDeletedMessagesRangesSerializedSize: {
              title: 'Non Contiguous Deleted Messages Ranges Serialized Size',
              render: (_, ld) => i18n.withVoidDefault(ld?.stats.getNonContiguousDeletedMessagesRangesSerializedSize()?.getValue(), i18n.formatBytes),
            },
            lastCompactionRemovedEventCount: {
              title: 'Last Compaction Removed Event Count',
              render: (_, ld) => i18n.withVoidDefault(ld?.stats.getCompaction()?.getLastCompactionRemovedEventCount()?.getValue(), v => v.toString()),
            },
            lastCompactionSucceedTimestamp: {
              title: 'Last Compaction Succeed Timestamp',
              render: (_, ld) => i18n.withVoidDefault(ld?.stats.getCompaction()?.getLastCompactionSucceedTimestamp()?.getValue() || undefined, (v) => i18n.formatDate(new Date(v))),
            },
            lastCompactionFailedTimestamp: {
              title: 'Last Compaction Failed Timestamp',
              render: (_, ld) => i18n.withVoidDefault(ld?.stats.getCompaction()?.getLastCompactionFailedTimestamp()?.getValue() || undefined, (v) => i18n.formatDate(new Date(v))),
            },
            lastCompactionDurationTimeInMills: {
              title: 'Last Compaction Duration Time',
              render: (_, ld) => i18n.withVoidDefault(ld?.stats.getCompaction()?.getLastCompactionDurationTimeInMills()?.getValue() || undefined, i18n.formatDuration),
            },
            ownerBroker: {
              title: 'Owner Broker',
              render: (_, ld) => i18n.withVoidDefault(ld?.stats.getOwnerBroker()?.getValue(), v => v.toString()),
            },
            delayedMessageIndexSizeInBytes: {
              title: 'Delayed Message Index Size In Bytes',
              render: (_, ld) => i18n.withVoidDefault(ld?.stats.getDelayedMessageIndexSizeInBytes()?.getValue(), i18n.formatBytes),
            }
          },
          defaultConfig: [
            { key: 'topicName', visibility: 'visible', stickyTo: 'left', width: 200 },
            { key: 'topicType', visibility: 'visible', width: 100 },
            { key: 'producersCount', visibility: 'visible', width: 100 },
            { key: 'subscriptionsCount', visibility: 'visible', width: 100 },
            { key: 'msgRateIn', visibility: 'visible', width: 100 },
            { key: 'msgThroughputIn', visibility: 'visible', width: 100 },
            { key: 'msgRateOut', visibility: 'visible', width: 100 },
            { key: 'msgThroughputOut', visibility: 'visible', width: 100 },
            { key: 'bytesInCounter', visibility: 'visible', width: 100 },
            { key: 'msgInCounter', visibility: 'visible', width: 100 },
            { key: 'bytesOutCounter', visibility: 'visible', width: 100 },
            { key: 'msgOutCounter', visibility: 'visible', width: 100 },
            { key: 'averageMsgSize', visibility: 'visible', width: 100 },
            { key: 'isMsgChunkPublished', visibility: 'visible', width: 100 },
            { key: 'storageSize', visibility: 'visible', width: 100 },
            { key: 'backlogSize', visibility: 'visible', width: 100 },
            { key: 'earliestMsgPublishTimeInBacklogs', visibility: 'visible', width: 200 },

            { key: 'offloadedStorageSize', visibility: 'visible', width: 100 },
            { key: 'waitingPublishers', visibility: 'visible', width: 100 },
            { key: 'replicatorsCount', visibility: 'visible', width: 100 },
            { key: 'deduplicationStatus', visibility: 'visible', width: 100 },
            { key: 'topicEpoch', visibility: 'visible', width: 100 },
            { key: 'nonContiguousDeletedMessagesRanges', visibility: 'visible', width: 100 },
            { key: 'nonContiguousDeletedMessagesRangesSerializedSize', visibility: 'visible', width: 100 },
            { key: 'lastCompactionRemovedEventCount', visibility: 'visible', width: 100 },
            { key: 'lastCompactionSucceedTimestamp', visibility: 'visible', width: 200 },
            { key: 'lastCompactionFailedTimestamp', visibility: 'visible', width: 200 },
            { key: 'lastCompactionDurationTimeInMills', visibility: 'visible', width: 100 },
            { key: 'ownerBroker', visibility: 'visible', width: 100 },
            { key: 'delayedMessageIndexSizeInBytes', visibility: 'visible', width: 100 },
          ]
        }}
        data={topicsToShow}
        getId={(d) => d.fqn}
        tableId='topics-table'
        defaultSort={{ type: 'by-single-column', column: 'topicName', direction: 'asc' }}
        lazyData={{
          loader: async (entries) => {
            const req = new pb.GetTopicsStatsRequest();

            req.setIsGetPreciseBacklog(true);
            req.setIsEarliestTimeInBacklog(true);
            req.setIsSubscriptionBacklogSize(true);
            req.setIsPerPartition(false);

            const nonPartitionedTopics = entries.filter((entry) => entry.partitioningType !== 'partitioned');
            req.setTopicsList(nonPartitionedTopics.map((entry) => entry.fqn));

            const partitionedTopics = entries.filter((entry) => entry.partitioningType === 'partitioned');
            req.setPartitionedTopicsList(partitionedTopics.map((entry) => entry.fqn));

            const res = await topicServiceClient.getTopicsStats(req, null)
              .catch((err) => notifyError(`Unable to get topics stats: ${err}`));

            if (res === undefined) {
              return {};
            }

            if (res.getStatus()?.getCode() !== Code.OK) {
              notifyError(`Unable to get topics stats: ${res.getStatus()?.getMessage()}`);
              return {};
            }

            return statsToLazyData(res);
          }
        }}
      />
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
      partitioningType: 'non-partitioned',
      persistencyType: detectPersistenceType(topic.topicFqn),
    });
  }

  for (const topic of topics.partitionedTopics) {
    result.push(
      {
        fqn: topic.topicFqn,
        name: getTopicName(topic.topicFqn),
        partitioningType: 'partitioned',
        persistencyType: detectPersistenceType(topic.topicFqn)
      }
    );

    for (const partitionFqn of topic.partitions) {
      result.push(
        {
          fqn: partitionFqn,
          name: getTopicName(partitionFqn),
          partitioningType: 'partition',
          persistencyType: detectPersistenceType(partitionFqn)
        }
      );
    }
  }

  return result;
}

function statsToLazyData(res: pb.GetTopicsStatsResponse): Record<string, LazyDataEntry> {
  let result: Record<string, LazyDataEntry> = {};

  const nonPartitionedStats = pbUtils.mapToObject(res.getTopicStatsMap());
  Object.entries(nonPartitionedStats).forEach(([topicFqn, stats]) => {
    result[topicFqn] = { stats };
  });

  const partitionedStats = pbUtils.mapToObject(res.getPartitionedTopicStatsMap());
  Object.entries(partitionedStats).forEach(([topicFqn, partitionedTopicStats]) => {
    const stats = partitionedTopicStats.getStats();
    if (stats !== undefined) {
      result[topicFqn] = { stats };
    }
  });

  return result;
}

export default Topics;
