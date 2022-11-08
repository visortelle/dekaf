import React from 'react';
import { useQueryParam, withDefault, BooleanParam } from 'use-query-params';

import ConfigurationTable from '../../ui/ConfigurationTable/ConfigurationTable';
import Checkbox from '../../ui/Checkbox/Checkbox';
import * as BrokersConfig from '../../app/contexts/BrokersConfig';

import messageTtlField from './fields/message-ttl';
import backlogQuotaField from './fields/backlog-quota';
import delayedDelivery from './fields/delayed-delivery';

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
      <div className={s.ConfigurationTable}>
        <div>
          <span>Is global</span>
          <Checkbox
            value={isGlobal}
            onChange={() => setIsGlobal(v => !v)}
          />
        </div>

        <ConfigurationTable
          title="Retention"
          fields={[
            messageTtlField,
            backlogQuotaField,
            delayedDelivery
          ].map(field => field({ ...props, isGlobal }))}
        />
      </div>
    </div>
  );
}

export default Policies;
