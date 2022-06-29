import React from 'react';
import s from './Policies.module.css'
import ConfigurationTable from '../../ui/ConfigurationTable/ConfigurationTable';
import messageTtlField from './fields/message-ttl';
import * as BrokersConfig from '../../app/contexts/BrokersConfig';

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
          title="All"
          fields={[
            messageTtlField,
          ].map(field => field(props))}
        />
      </div>
    </div>
  );
}

export default Policies;
