import React from 'react';

import ConfigurationTable from '../../ui/ConfigurationTable/ConfigurationTable';
import replicationClustersField from './fields/replication-clusters';
import subscriptionTypesEnabledField from './fields/subscription-types-enabled';
import backlogQuotaField from './fields/backlog-quota';
import persistenceField from './fields/persistence';
import messageTtlField from './fields/message-ttl';
import maxSubscriptionsPerTopicField from './fields/max-subscriptions-per-topic';
import subscriptionExpirationTimeField from './fields/subscription-expiration-time';
import antiAffinityGroupField from './fields/anti-affinity-group';
import deduplicationField from './fields/deduplication';
import autoSubscriptionCreationField from './fields/auto-subscription-creation';
import retentionField from './fields/retention';
import bookieAffinityGroupField from './fields/bookie-affinity-group';
import autoTopicCreationField from './fields/auto-topic-creation';
import encryptionRequiredField from './fields/encryption-required';
import subscriptionAuthModeField from './fields/subscription-auth-mode';
import delayedDeliveryField from './fields/delayed-delivery';
import dispatchRateField from './fields/dispatch-rate';
import subscribeRateField from './fields/subscribe-rate';
import subscriptionDispatchRateField from './fields/subscription-dispatch-rate';
import replicatorDispatchRateField from './fields/replicator-dispatch-rate';
import inactiveTopicPoliciesField from './fields/inactive-topic-policies';
import maxProducersPerTopicField from './fields/max-producers-per-topic';
import maxConsumersPerTopicField from './fields/max-consumers-per-topic';
import maxTopicsPerNamespaceField from './fields/max-topics-per-namespace';
import maxConsumersPerSubscriptionField from './fields/max-consumers-per-subscription';
import maxUnackedMessagesPerSubscriptionField from './fields/max-unacked-messages-per-subscription';
import maxUnackedMessagesPerConsumerField from './fields/max-unacked-messages-per-consumer';
import compactionThresholdField from './fields/compaction-threshold';
import deduplicationSnapshotIntervalField from './fields/deduplication-shapshot-interval';
import schemaCompatibilityStrategyField from './fields/schema-compatibility-strategy';
import isAllowAutoUpdateSchemaField from './fields/allow-auto-update-schema';
import schemaValidationEnforceField from './fields/schema-validation-enforce';
import offloadPoliciesField from './fields/offload-policies/offload-policies';
import publishRateField from './fields/publish-rate';
import resourceGroupField from './fields/resource-group';
import Tabs from '../../ui/Tabs/Tabs';

import s from './NamespaceDetails.module.css'

export type NamespaceDetailsProps = {
  tenant: string;
  namespace: string;
};

type TabsKey =
  'resource-management' |
  'geo-replication' |
  'encryption' |
  'persistence' |
  'limits' |
  'tiered-storage' |
  'bundles' |
  'rate-limits' |
  'compaction' |
  'deduplication' |
  'delayed-delivery' |
  'retention' |
  'messaging' |
  'schema' |
  'permissions'

const NamespaceDetails: React.FC<NamespaceDetailsProps> = (props) => {
  const [activeTab, setActiveTab] = React.useState<TabsKey>('retention');

  return (
    <div className={s.Policies}>
      <div className={s.Tabs}>
        <Tabs<TabsKey>
          activeTab={activeTab}
          direction='vertical'
          onActiveTabChange={setActiveTab}
          tabs={{
            retention: {
              title: 'Retention',
              render: () => (
                <div className={s.ConfigurationTable}>
                  <ConfigurationTable
                    title="Retention"
                    fields={[
                      inactiveTopicPoliciesField,
                      retentionField,
                      backlogQuotaField,
                      messageTtlField,
                    ].map(field => field(props))}
                  />
                </div>
              )
            },
            "namespace-config": {
              title: 'Namespace',
              render: () => (
                <div className={s.ConfigurationTable}>
                  <ConfigurationTable
                    title="Namespace"
                    fields={[
                      replicationClustersField,
                      persistenceField,
                      compactionThresholdField,
                      resourceGroupField,
                    ].map(field => field(props))}
                  />
                </div>
              )
            },
            "delayed-delivery": {
              title: 'Delayed Delivery',
              render: () => (
                <div className={s.ConfigurationTable}>
                  <ConfigurationTable
                    title="Delayed Delivery"
                    fields={[
                      delayedDeliveryField,
                    ].map(field => field(props))}
                  />
                </div>
              )
            },
            topics: {
              title: 'Topics',
              render: () => (
                <div className={s.ConfigurationTable}>
                  <ConfigurationTable
                    title="Topics"
                    fields={[
                      autoTopicCreationField,
                    ].map(field => field(props))}
                  />
                </div>
              )
            },
            consumers: {
              title: 'Consumers',
              render: () => (
                <div className={s.ConfigurationTable}>
                  <ConfigurationTable
                    title="Consumer"
                    fields={[
                      maxUnackedMessagesPerConsumerField
                    ].map(field => field(props))}
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
                      autoSubscriptionCreationField,
                      subscriptionTypesEnabledField,
                      subscriptionExpirationTimeField,
                      subscriptionAuthModeField,
                      maxUnackedMessagesPerSubscriptionField
                    ].map(field => field(props))}
                  />
                </div>
              )
            },
            'limits': {
              title: 'Limits',
              render: () => (
                <div className={s.ConfigurationTable}>
                  <ConfigurationTable
                    title="Limits"
                    fields={[
                      maxConsumersPerTopicField,
                      maxConsumersPerSubscriptionField,
                      maxProducersPerTopicField,
                      maxSubscriptionsPerTopicField,
                      maxTopicsPerNamespaceField,
                    ].map(field => field(props))}
                  />
                </div>
              )
            },
            'rate-limits': {
              title: 'Rate Limits',
              render: () => (
                <div className={s.ConfigurationTable}>
                  <ConfigurationTable
                    title="Rate Limits"
                    fields={[
                      dispatchRateField,
                      publishRateField,
                      replicatorDispatchRateField,
                      subscriptionDispatchRateField,
                      subscribeRateField,
                    ].map(field => field(props))}
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
                    ].map(field => field(props))}
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
                      schemaValidationEnforceField,
                      schemaCompatibilityStrategyField,
                      isAllowAutoUpdateSchemaField,
                    ].map(field => field(props))}
                  />
                </div>
              )
            },
            affinity: {
              title: 'Affinity',
              render: () => (
                <div className={s.ConfigurationTable}>
                  <ConfigurationTable
                    title="Affinity"
                    fields={[
                      antiAffinityGroupField,
                      bookieAffinityGroupField,
                    ].map(field => field(props))}
                  />
                </div>
              )
            },
            encryption: {
              title: 'Encryption',
              render: () => (
                <div className={s.ConfigurationTable}>
                  <ConfigurationTable
                    title="Encryption"
                    fields={[
                      encryptionRequiredField,
                    ].map(field => field(props))}
                  />
                </div>
              )
            },
            'tiered-storage': {
              title: 'Tiered Storage',
              render: () => (
                <div className={s.ConfigurationTable}>
                  <ConfigurationTable
                    title="Tiered storage"
                    fields={[
                      offloadPoliciesField
                    ].map(field => field(props))}
                  />
                </div>
              )
            }
          }}
        />
      </div>

    </div>
  );
}

export default NamespaceDetails;
