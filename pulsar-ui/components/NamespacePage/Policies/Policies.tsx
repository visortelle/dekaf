import React from 'react';
import s from './Policies.module.css'
import ConfigurationTable from '../../ConfigurationTable/ConfigurationTable';
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
import maxConsumersPerSubscriptionField from './fields/max-consumers-per-subscription';
import maxUnackedMessagesPerSubscriptionField from './fields/max-unacked-messages-per-subscription';
import maxUnackedMessagesPerConsumerField from './fields/max-unacked-messages-per-consumer';
import compactionThresholdField from './fields/compaction-threshold';
import offloadThresholdField from './fields/offload-threshold';
import offloadDeletionLagField from './fields/offload-deletion-lag';
import deduplicationSnapshotIntervalField from './fields/deduplication-shapshot-interval';
import schemaCompatibilityStrategyField from './fields/schema-compatibility-strategy';

export type PoliciesProps = {
  tenant: string;
  namespace: string;
};

const Policies: React.FC<PoliciesProps> = (props) => {
  return (
    <div className={s.Policies}>
      <div className={s.ConfigurationTable}>
        <ConfigurationTable
          title="Namespace"
          fields={[
            replicationClustersField,
            persistenceField,
            compactionThresholdField,
            offloadThresholdField,
            offloadDeletionLagField,
          ].map(field => field(props))}
        />
      </div>

      <div className={s.ConfigurationTable}>
        <ConfigurationTable
          title="Message retention"
          fields={[
            retentionField,
            backlogQuotaField,
            messageTtlField,
          ].map(field => field(props))}
        />
      </div>

      <div className={s.ConfigurationTable}>
        <ConfigurationTable
          title="Deduplication"
          fields={[
            deduplicationField,
            deduplicationSnapshotIntervalField
          ].map(field => field(props))}
        />
      </div>

      <div className={s.ConfigurationTable}>
        <ConfigurationTable
          title="Schema"
          fields={[
            schemaCompatibilityStrategyField
          ].map(field => field(props))}
        />
      </div>

      <div className={s.ConfigurationTable}>
        <ConfigurationTable
          title="Topics"
          fields={[
            autoTopicCreationField,
            inactiveTopicPoliciesField,
            maxProducersPerTopicField,
            maxConsumersPerTopicField,
            maxSubscriptionsPerTopicField,
            dispatchRateField,
            subscribeRateField,
            replicatorDispatchRateField,
          ].map(field => field(props))}
        />
      </div>

      <div className={s.ConfigurationTable}>
        <ConfigurationTable
          title="Consumers"
          fields={[
            maxUnackedMessagesPerConsumerField
          ].map(field => field(props))}
        />
      </div>

      <div className={s.ConfigurationTable}>
        <ConfigurationTable
          title="Subscriptions"
          fields={[
            autoSubscriptionCreationField,
            subscriptionTypesEnabledField,
            subscriptionDispatchRateField,
            subscriptionExpirationTimeField,
            subscriptionAuthModeField,
            maxConsumersPerSubscriptionField,
            maxUnackedMessagesPerSubscriptionField
          ].map(field => field(props))}
        />
      </div>

      <div className={s.ConfigurationTable}>
        <ConfigurationTable
          title="Various"
          fields={[
            antiAffinityGroupField,
            bookieAffinityGroupField,
            encryptionRequiredField,
            delayedDeliveryField,
          ].map(field => field(props))}
        />
      </div>
    </div>
  );
}

export default Policies;
