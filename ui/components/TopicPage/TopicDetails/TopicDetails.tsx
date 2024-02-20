import React from 'react';
import { useQueryParam, withDefault, BooleanParam, StringParam } from 'use-query-params';

import ConfigurationTable from '../../ui/ConfigurationTable/ConfigurationTable';
import Checkbox from '../../ui/Checkbox/Checkbox';
import * as BrokersConfig from '../../app/contexts/BrokersConfig';

import messageTtlField from './fields/message-ttl';
import backlogQuotaField from './fields/backlog-quota';
import delayedDeliveryField from './fields/delayed-delivery';
import retentionField from './fields/retention';
import maxUnackedMessagesPerConsumerField from './fields/max-unacked-messages-per-consumer';
import maxUnackedMessagesPerSubscriptionField from './fields/max-unacked-messages-per-subscription';
import inactiveTopicPoliciesField from './fields/inactive-topic-policies';
import persistenceField from './fields/persistence';
import deduplicationField from './fields/deduplication';
import deduplicationSnapshotIntervalField from './fields/deduplication-shapshot-interval';
import dispatchRateField from './fields/dispatch-rate';
import replicatorDispatchRateField from './fields/replicator-dispatch-rate';
import subscriptionDispatchRateField from './fields/subscription-dispatch-rate';
import compactionThresholdField from './fields/compaction-threshold';
import publishRateField from './fields/publish-rate';
import maxConsumersPerSubscriptionField from './fields/max-consumers-per-subscription';
import maxConsumersField from './fields/max-consumers';
import maxProducersField from './fields/max-producers';
import schemaCompatibilityStrategyField from './fields/schema-compatibility-strategy';
import subscribeRateField from './fields/subscribe-rate';
import subscriptionTypesEnabledField from './fields/subscription-types-enabled';
import maxSubscriptionsField from './fields/max-subscriptions';
import maxMessageSizeField from './fields/max-message-size';

import s from './TopicDetails.module.css'
import Tabs, { Tab } from "../../ui/Tabs/Tabs";
import { PulsarTopicPersistency } from '../../pulsar/pulsar-resources';
import { PartitioningWithActivePartitions } from '../TopicPage';
import NothingToShow from '../../ui/NothingToShow/NothingToShow';
import TopicCompactionEditor from './fields/TopicCompactionEditor/TopicCompactionEditor';
import CreateMissedPartitionsButton from '../Overview/CreateMissedPartitionsButton/CreateMissedPartitionsButton';

export type TopicDetailsProps = {
  tenant: string;
  namespace: string;
  topic: string;
  topicPersistency: PulsarTopicPersistency;
  partitioning: PartitioningWithActivePartitions;
};

type TabsKey =
  'delayed-delivery' |
  'geo-replication' |
  'limits' |
  'message-deduplication' |
  'messaging' |
  'persistence' |
  'rate-limits' |
  'retention' |
  'schema' |
  'topic-compaction';

const partitionRegexp = /^(.*)-(partition-\d+)$/;

const TopicDetails: React.FC<TopicDetailsProps> = (props) => {
  const [isGlobal, setIsGlobal] = useQueryParam('isGlobal', withDefault(BooleanParam, false));

  const isPartition = partitionRegexp.test(props.topic);
  const [activeTab, setActiveTab] = useQueryParam('category', withDefault(StringParam, isPartition ? 'topic-compaction' : 'delayed-delivery'));

  const brokersConfig = BrokersConfig.useContext();
  const isTopicLevelPoliciesEnabled = brokersConfig.get('topicLevelPoliciesEnabled')?.value;

  if (isTopicLevelPoliciesEnabled !== 'true') {
    return (
      <div style={{ padding: '18rem', maxWidth: '640rem' }}>
        Topic level policies are not enabled.
        <br />
        To enable it, add <code>topicLevelPoliciesEnabled=true</code> to your <code>broker.conf</code> file and restart broker or contact Pulsar administrator.
      </div>
    );
  }

  const isNoActivePartitions = props.partitioning.isPartitioned && props.partitioning.activePartitionsCount === 0;
  const noActivePartitionsError = isNoActivePartitions ? (
    <div style={{ padding: '12rem', marginTop: '48rem', maxWidth: '480rem' }}>
      <NothingToShow
        content={(
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: '12rem' }}>
              The topic is partitioned, but no active partitions found. In this case topic policies can't be loaded.
            </div>
            <CreateMissedPartitionsButton topicFqn={`${props.topicPersistency}://${props.tenant}/${props.namespace}/${props.topic}`} />
          </div>
        )}
      />
    </div>
  ) : null;

  const tabs: Tab<TabsKey>[] = isPartition ? [
    {
      key: 'topic-compaction',
      title: 'Topic Compaction',
      render: () => (
        <div className={s.ConfigurationTable}>
          <ConfigurationTable
            title="Topic Compaction"
            fields={[]}
          />
          <TopicCompactionEditor
            tenant={props.tenant}
            namespace={props.namespace}
            partitioning={props.partitioning}
            topic={props.topic}
            topicPersistency={props.topicPersistency}
          />
        </div>
      )
    }] : [{
      key: 'delayed-delivery',
      title: 'Delayed Delivery',
      render: () => isNoActivePartitions ? noActivePartitionsError : (
        <div className={s.ConfigurationTable}>
          <ConfigurationTable
            title="Delayed Delivery"
            fields={[
              delayedDeliveryField,
            ].map(field => field({ ...props, isGlobal }))}
          />
        </div>
      )
    },
    {
      key: 'geo-replication',
      title: 'Geo Replication',
      render: () => isNoActivePartitions ? noActivePartitionsError : (
        <div className={s.ConfigurationTable}>
          <ConfigurationTable
            title="Geo Replication"
            fields={[
              replicatorDispatchRateField,
            ].map(field => field({ ...props, isGlobal }))}
          />
        </div>
      )
    },
    {
      key: 'limits',
      title: 'Limits',
      render: () => isNoActivePartitions ? noActivePartitionsError : (
        <div className={s.ConfigurationTable}>
          <ConfigurationTable
            title="Limits"
            fields={[
              maxConsumersField,
              maxConsumersPerSubscriptionField,
              maxProducersField,
              maxSubscriptionsField
            ].map(field => field({ ...props, isGlobal }))}
          />
        </div>
      )
    },
    {
      key: 'message-deduplication',
      title: 'Message Deduplication',
      render: () => isNoActivePartitions ? noActivePartitionsError : (
        <div className={s.ConfigurationTable}>
          <ConfigurationTable
            title="Message Deduplication"
            fields={[
              deduplicationField,
              deduplicationSnapshotIntervalField
            ].map(field => field({ ...props, isGlobal }))}
          />
        </div>
      )
    },
    {
      key: 'messaging',
      title: 'Messaging',
      render: () => isNoActivePartitions ? noActivePartitionsError : (
        <div className={s.ConfigurationTable}>
          <ConfigurationTable
            title="Messaging"
            fields={[
              maxMessageSizeField,
              maxUnackedMessagesPerConsumerField,
              maxUnackedMessagesPerSubscriptionField,
              subscriptionTypesEnabledField
            ].map(field => field({ ...props, isGlobal }))}
          />
        </div>
      )
    },
    {
      key: 'persistence',
      title: 'Persistence',
      render: () => isNoActivePartitions ? noActivePartitionsError : (
        <div className={s.ConfigurationTable}>
          <ConfigurationTable
            title="Persistence"
            fields={[
              persistenceField,
            ].map(field => field({ ...props, isGlobal }))}
          />
        </div>
      )
    },
    {
      key: 'rate-limits',
      title: 'Rate Limits',
      render: () => isNoActivePartitions ? noActivePartitionsError : (
        <div className={s.ConfigurationTable}>
          <ConfigurationTable
            title="Rate Limits"
            fields={[
              dispatchRateField,
              publishRateField,
              replicatorDispatchRateField,
              subscriptionDispatchRateField,
              subscribeRateField,
            ].map(field => field({ ...props, isGlobal }))}
          />
        </div>
      )
    },
    {
      key: 'retention',
      title: 'Retention',
      render: () => isNoActivePartitions ? noActivePartitionsError : (
        <div className={s.ConfigurationTable}>
          <ConfigurationTable
            title="Retention"
            fields={[
              inactiveTopicPoliciesField,
              retentionField,
              backlogQuotaField,
              messageTtlField
            ].map(field => field({ ...props, isGlobal }))}
          />
        </div>
      )
    },
    {
      key: 'schema',
      title: 'Schema',
      render: () => isNoActivePartitions ? noActivePartitionsError : (
        <div className={s.ConfigurationTable}>
          <ConfigurationTable
            title="Schema"
            fields={[
              schemaCompatibilityStrategyField
            ].map(field => field({ ...props, isGlobal }))}
          />
        </div>
      )
    },
    {
      key: 'topic-compaction',
      title: 'Topic Compaction',
      render: () => isNoActivePartitions ? noActivePartitionsError : (
        <div className={s.ConfigurationTable}>
          <ConfigurationTable
            title="Topic Compaction"
            fields={[
              compactionThresholdField,
            ].map(field => field({ ...props, isGlobal }))}
          />
          {!props.partitioning.isPartitioned && (
            <TopicCompactionEditor
              tenant={props.tenant}
              namespace={props.namespace}
              partitioning={props.partitioning}
              topic={props.topic}
              topicPersistency={props.topicPersistency}
              isHideDescription={true}
            />
          )}
        </div>
      )
    }];

  return (
    <div className={s.Policies}>
      <div className={s.IsGlobalCheckbox}>
        <Checkbox
          checked={isGlobal}
          onChange={() => setIsGlobal(v => !v)}
        />
        <span>Is global</span>
      </div>

      <div className={s.Tabs}>
        <Tabs<TabsKey>
          activeTab={activeTab as TabsKey}
          direction='vertical'
          onActiveTabChange={setActiveTab}
          tabs={tabs}
        />
      </div>
    </div>
  );
}

export default TopicDetails;
