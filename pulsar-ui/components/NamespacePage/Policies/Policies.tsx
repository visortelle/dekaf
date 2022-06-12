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

export type PoliciesProps = {
  tenant: string;
  namespace: string;
};

const Policies: React.FC<PoliciesProps> = (props) => {
  return (
    <div className={s.Policies}>
      <ConfigurationTable
        fields={[
          replicationClustersField({ tenant: props.tenant, namespace: props.namespace }),
          subscriptionTypesEnabledField({ tenant: props.tenant, namespace: props.namespace }),
          backlogQuotaField({ tenant: props.tenant, namespace: props.namespace }),
          persistenceField({ tenant: props.tenant, namespace: props.namespace }),
          messageTtlField({ tenant: props.tenant, namespace: props.namespace }),
          maxSubscriptionsPerTopicField({ tenant: props.tenant, namespace: props.namespace }),
          subscriptionExpirationTimeField({ tenant: props.tenant, namespace: props.namespace }),
          antiAffinityGroupField({ tenant: props.tenant, namespace: props.namespace }),
          deduplicationField({ tenant: props.tenant, namespace: props.namespace }),
        ]}
      />
    </div>
  );
}

export default Policies;
