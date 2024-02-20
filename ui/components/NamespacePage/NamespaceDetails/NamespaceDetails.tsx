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
import Permissions from './Permissions/Permissions';
import Tabs from '../../ui/Tabs/Tabs';

import s from './NamespaceDetails.module.css'
import NamespaceBundlesEditor from './NamespaceBundlesEditor/NamespaceBundlesEditor';
import { StringParam, useQueryParam, withDefault } from 'use-query-params';

export type NamespaceDetailsProps = {
  tenant: string;
  namespace: string;
};

type TabsKey =
  'access-control' |
  'bundles' |
  'compute-resources' |
  'delayed-delivery' |
  'encryption' |
  'geo-replication' |
  'limits' |
  'message-deduplication' |
  'messaging' |
  'persistence' |
  'rate-limits' |
  'retention' |
  'schema' |
  'tiered-storage' |
  'topic-compaction';

const NamespaceDetails: React.FC<NamespaceDetailsProps> = (props) => {
  const [activeTab, setActiveTab] = useQueryParam('category', withDefault(StringParam, 'access-control'));

  return (
    <div className={s.NamespaceDetails}>
      <div className={s.Tabs}>
        <Tabs<TabsKey>
          activeTab={activeTab as TabsKey}
          direction='vertical'
          onActiveTabChange={setActiveTab}
          tabs={[
            {
              key: 'access-control',
              title: 'Access Control',
              render: () => (
                <div>
                  <div className={s.ConfigurationTable}>
                    <ConfigurationTable
                      title="Access Control"
                      fields={[
                        subscriptionAuthModeField,
                      ].map(field => field(props))}
                    />
                  </div>
                  <div style={{ padding: '0 24rem', overflow: 'auto' }}>
                    <Permissions tenant={props.tenant} namespace={props.namespace} />
                  </div>
                </div>
              )
            },
            {
              key: 'bundles',
              title: 'Bundles',
              render: () => (
                <div>
                  <div className={s.ConfigurationTable}>
                    <ConfigurationTable
                      title="Bundles"
                      fields={[]}
                    />
                  </div>
                  <div style={{ padding: '0 24rem' }}>
                    <NamespaceBundlesEditor tenant={props.tenant} namespace={props.namespace} />
                  </div>
                </div>
              )
            },
            {
              key: 'compute-resources',
              title: 'Compute Resources',
              render: () => (
                <div className={s.ConfigurationTable}>
                  <ConfigurationTable
                    title="Compute Resources"
                    fields={[
                      resourceGroupField,
                      antiAffinityGroupField,
                      bookieAffinityGroupField,
                    ].map(field => field(props))}
                  />
                </div>
              )
            },
            {
              key: 'delayed-delivery',
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
            {
              key: 'encryption',
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
            {
              key: 'geo-replication',
              title: 'Geo Replication',
              render: () => (
                <div className={s.ConfigurationTable}>
                  <ConfigurationTable
                    title="Geo Replication"
                    fields={[
                      replicationClustersField,
                      replicatorDispatchRateField,
                    ].map(field => field(props))}
                  />
                </div>
              )
            },
            {
              key: 'limits',
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
            {
              key: 'messaging',
              title: 'Messaging',
              render: () => (
                <div className={s.ConfigurationTable}>
                  <ConfigurationTable
                    title="Messaging"
                    fields={[
                      autoTopicCreationField,
                      autoSubscriptionCreationField,
                      maxUnackedMessagesPerConsumerField,
                      maxUnackedMessagesPerSubscriptionField,
                      subscriptionTypesEnabledField,
                      subscriptionExpirationTimeField
                    ].map(field => field(props))}
                  />
                </div>
              )
            },
            {
              key: 'message-deduplication',
              title: 'Message Deduplication',
              render: () => (
                <div className={s.ConfigurationTable}>
                  <ConfigurationTable
                    title="Message Deduplication"
                    fields={[
                      deduplicationField,
                      deduplicationSnapshotIntervalField
                    ].map(field => field(props))}
                  />
                </div>
              )
            },
            {
              key: 'persistence',
              title: 'Persistence',
              render: () => (
                <div className={s.ConfigurationTable}>
                  <ConfigurationTable
                    title="Persistence"
                    fields={[
                      persistenceField,
                    ].map(field => field(props))}
                  />
                </div>
              )
            },
            {
              key: 'rate-limits',
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
            {
              key: 'retention',
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
            {
              key: 'schema',
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
            {
              key: 'tiered-storage',
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
            },
            {
              key: 'topic-compaction',
              title: 'Topic Compaction',
              render: () => (
                <div className={s.ConfigurationTable}>
                  <ConfigurationTable
                    title="Topic Compaction"
                    fields={[
                      compactionThresholdField,
                    ].map(field => field(props))}
                  />
                </div>
              )
            }
          ]}
        />
      </div>

    </div>
  );
}

export default NamespaceDetails;
