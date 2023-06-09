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
import Table from '../../TopicPage/Subscriptions/Table/Table';
import { partition, uniq } from 'lodash';
import A from '../../ui/A/A';

type ColumnKey =
  'topicName' |
  'topicType' |
  'producersCount' |
  'subscriptionsCount'
type TopicDataEntry = {
  fqn: string,
  name: string,
  partitioningType: 'partitioned' | 'non-partitioned' | 'partition',
  persistencyType: 'persistent' | 'non-persistent',
}

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
  console.log('persistent topics', persistentTopics)

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

      {(topicsToShow || []).length > 0 && (
        <Table<ColumnKey, TopicDataEntry, {}>
          columns={{
            columns: {
              topicName: {
                title: 'Name',
                render: (de) => de.name,
                sortFn: (a, b) => a.data.name.localeCompare(b.data.name),
              },
              producersCount: {
                title: 'Producers',
                render: () => 0,
              },
              subscriptionsCount: {
                title: 'Subscriptions',
                render: () => 0,
              },
              topicType: {
                title: 'Type',
                render: (de) => de.persistencyType,
              }
            },
            defaultConfig: [
              { key: 'topicName', visibility: 'visible', stickyTo: 'left', width: 200 },
              { key: 'topicType', visibility: 'visible', stickyTo: 'none', width: 200 },
              { key: 'producersCount', visibility: 'visible', stickyTo: 'none', width: 100 },
              { key: 'subscriptionsCount', visibility: 'visible', stickyTo: 'none', width: 100 },
            ]
          }}
          data={topicsToShow}
          getId={(d) => d.name}
          tableId='topics-table'
          defaultSort={{ type: 'by-single-column', column: 'topicName', direction: 'asc' }}
        // lazyData={{
        // loader: async (entries) => {
        //   const req = new pb.GetTopicsStatsRequest();
        //   topicServiceClient.getTopicsStats()
        // }
        // }}
        />
      )}
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

function makeTopicDataEntries(topics: DetectPartitionedTopicsResult): TopicDataEntry[] {
  let result: TopicDataEntry[] = [];

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

export default Topics;
