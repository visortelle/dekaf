import React from 'react';
import { useQueryParam, withDefault, BooleanParam } from 'use-query-params';

import ConfigurationTable from '../../ui/ConfigurationTable/ConfigurationTable';
import Checkbox from '../../ui/Checkbox/Checkbox';
import { H1 } from '../../ui/H/H';
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
import subscribyRateField from './fields/subscribe-rate';
import subscriptionTypesEnabledField from './fields/subscription-types-enabled';
import maxSubscriptionsPerTopicField from './fields/max-subscriptions-per-topic';
import maxMessageSizeField from './fields/max-message-size';

import s from './Policies.module.css'

export type PoliciesProps = {
  tenant: string;
  namespace: string;
  topic: string;
  topicType: 'persistent' | 'non-persistent';
};

const Policies: React.FC<PoliciesProps> = (props) => {
  const [isGlobal, setIsGlobal] = useQueryParam('isGlobal', withDefault(BooleanParam, false));

  const brokersConfig = BrokersConfig.useContext();
  const isTopicLevelPoliciesEnabled = brokersConfig.get('topicLevelPoliciesEnabled')?.value;

  if (isTopicLevelPoliciesEnabled !== 'true') {
    return (
      <div style={{ padding: '18rem', maxWidth: '640rem' }}>
        Topic level policies are not enabled. To enable it, add <code>topicLevelPoliciesEnabled=true</code> to your <code>broker.conf</code> file and restart broker or contact Pulsar administrator.
      </div>
    );
  }

  return (
    <div className={s.Policies}>

      <div className={s.Title}>
        <H1>Topic policies</H1>
      </div>

      <div>
        <span>Is global</span>
        <Checkbox
          checked={isGlobal}
          onChange={() => setIsGlobal(v => !v)}
        />
      </div>

      <div className={s.ConfigurationTable}>
        <ConfigurationTable
          title="Topic"
          fields={[
            delayedDeliveryField,
            compactionThresholdField,
            persistenceField,
            publishRateField,
            subscribyRateField,
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

      <div className={s.ConfigurationTable}>
        <ConfigurationTable
          title="Consumers"
          fields={[
            maxUnackedMessagesPerConsumerField
          ].map(field => field({ ...props, isGlobal }))}
        />
      </div>

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

      <div className={s.ConfigurationTable}>
        <ConfigurationTable
          title="Deduplication"
          fields={[
            deduplicationField,
            deduplicationSnapshotIntervalField
          ].map(field => field({ ...props, isGlobal }))}
        />
      </div>

      <div className={s.ConfigurationTable}>
        <ConfigurationTable
          title="Schema"
          fields={[
            schemaCompatibilityStrategyField,
          ].map(field => field({ ...props, isGlobal }))}
        />
      </div>

    </div>
  );
}

export default Policies;
