import React from 'react';

import ConfigurationTable from '../../ui/ConfigurationTable/ConfigurationTable';
import * as BrokersConfig from '../../app/contexts/BrokersConfig';
import messageTtlField from './fields/message-ttl';
import backlogQuotaField from './fields/backlog-quota';

import s from './Policies.module.css'

export type PoliciesProps = {
  tenant: string;
  namespace: string;
  topic: string;
  topicType: 'persistent' | 'non-persistent';
};

const Policies: React.FC<PoliciesProps> = (props) => {
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
      <div className={s.ConfigurationTable}>
        <ConfigurationTable
          title="Retention"
          fields={[
            messageTtlField,
            backlogQuotaField,
          ].map(field => field(props))}
        />
      </div>
    </div>
  );
}

export default Policies;
