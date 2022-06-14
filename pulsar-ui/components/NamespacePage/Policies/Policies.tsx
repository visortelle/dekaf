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

export type PoliciesProps = {
  tenant: string;
  namespace: string;
};

const Policies: React.FC<PoliciesProps> = (props) => {
  return (
    <div className={s.Policies}>
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
          title="Various"
          fields={[
            replicationClustersField,
            subscriptionTypesEnabledField,
            persistenceField,
            maxSubscriptionsPerTopicField,
            subscriptionExpirationTimeField,
            antiAffinityGroupField,
            deduplicationField,
            autoSubscriptionCreationField,
            bookieAffinityGroupField,
            autoTopicCreationField,
            encryptionRequiredField,
            subscriptionAuthModeField,
            delayedDeliveryField,
            dispatchRateField,
            subscribeRateField,
            subscriptionDispatchRateField,
            replicatorDispatchRateField,
          ].map(field => field(props))}
        />
      </div>
    </div>
  );
}

export default Policies;
