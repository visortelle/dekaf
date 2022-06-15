import React from 'react';
import s from './Policies.module.css'
import ConfigurationTable from '../../ConfigurationTable/ConfigurationTable';
import messageTtlField from './fields/message-ttl';
import maxUnackedMessagesPerConsumer from './fields/max-unacked-messages-per-consumer';

export type PoliciesProps = {
  tenant: string;
  namespace: string;
  topic: string;
  topicType: 'persistent' | 'non-persistent';
};

const Policies: React.FC<PoliciesProps> = (props) => {
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
