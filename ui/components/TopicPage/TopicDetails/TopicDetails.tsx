import React from 'react';
import { useQueryParam, withDefault, BooleanParam } from 'use-query-params';

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
import maxConsumersPerTopicField from './fields/max-consumers-per-topic';
import maxProducersPerTopicField from './fields/max-producers-per-topic';
import schemaCompatibilityStrategyField from './fields/schema-compatibility-strategy';
import subscribeRateField from './fields/subscribe-rate';
import subscriptionTypesEnabledField from './fields/subscription-types-enabled';
import maxSubscriptionsPerTopicField from './fields/max-subscriptions-per-topic';
import maxMessageSizeField from './fields/max-message-size';

import s from './TopicDetails.module.css'
import Tabs from "../../ui/Tabs/Tabs";
import { PulsarTopicPersistency } from '../../pulsar/pulsar-resources';

export type TopicDetailsProps = {
  tenant: string;
  namespace: string;
  topic: string;
  topicPersistency: PulsarTopicPersistency;
};

type TabsKey =
  'topic-config' |
  'consumers' |
  'subscriptions' |
  'retention' |
  'deduplication' |
  'schema';

const TopicDetails: React.FC<TopicDetailsProps> = (props) => {
  const [isGlobal, setIsGlobal] = useQueryParam('isGlobal', withDefault(BooleanParam, false));
  const [activeTab, setActiveTab] = React.useState<TabsKey>('topic-config');

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
          activeTab={activeTab}
          direction='vertical'
          onActiveTabChange={setActiveTab}
          tabs={{
            "topic-config": {
              title: 'Topic ',
              render: () => (
                <div className={s.ConfigurationTable}>
                  <ConfigurationTable
                    title="Topic"
                    fields={[
                      delayedDeliveryField,
                      compactionThresholdField,
                      persistenceField,
                      publishRateField,
                      subscribeRateField,
                      maxMessageSizeField,
                      inactiveTopicPoliciesField,
                      maxProducersPerTopicField,
                      maxConsumersPerTopicField,
                      maxSubscriptionsPerTopicField,
                      dispatchRateField,
                      replicatorDispatchRateField,
                    ].map(field => field({ ...props, isGlobal }))}
                  />
                </div>
              )
            },
            consumers: {
              title: 'Consumers',
              render: () => (
                <div className={s.ConfigurationTable}>
                  <ConfigurationTable
                    title="Consumers"
                    fields={[
                      maxUnackedMessagesPerConsumerField
                    ].map(field => field({ ...props, isGlobal }))}
                  />
                </div>
              )
            },
            subscriptions: {
              title: 'Subscriptions',
              render: () => (
                <div className={s.ConfigurationTable}>
                  <ConfigurationTable
                    title="Subscriptions"
                    fields={[
                      subscriptionTypesEnabledField,
                      subscriptionDispatchRateField,
                      maxConsumersPerSubscriptionField,
                      maxUnackedMessagesPerSubscriptionField
                    ].map(field => field({ ...props, isGlobal }))}
                  />
                </div>
              )
            },
            retention: {
              title: 'Retention',
              render: () => (
                <div className={s.ConfigurationTable}>
                  <ConfigurationTable
                    title="Retention"
                    fields={[
                      retentionField,
                      backlogQuotaField,
                      messageTtlField,
                    ].map(field => field({ ...props, isGlobal }))}
                  />
                </div>
              )
            },
            deduplication: {
              title: 'Deduplication',
              render: () => (
                <div className={s.ConfigurationTable}>
                  <ConfigurationTable
                    title="Deduplication"
                    fields={[
                      deduplicationField,
                      deduplicationSnapshotIntervalField
                    ].map(field => field({ ...props, isGlobal }))}
                  />
                </div>
              )
            },
            schema: {
              title: 'Schema',
              render: () => (
                <div className={s.ConfigurationTable}>
                  <ConfigurationTable
                    title="Schema"
                    fields={[
                      schemaCompatibilityStrategyField,
                    ].map(field => field({ ...props, isGlobal }))}
                  />
                </div>
              )
            },
          }}
        />
      </div>
    </div>
  );
}

export default TopicDetails;
