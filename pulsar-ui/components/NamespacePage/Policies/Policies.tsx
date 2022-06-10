import React from 'react';
import s from './Policies.module.css'
import ConfigurationTable from '../../ConfigurationTable/ConfigurationTable';
import clustersField from './fields/clusters';
import subscriptionTypesEnabledField from './fields/subscription-types-enabled';
import backlogQuotaField from './fields/backlog-quota';

export type PoliciesProps = {
  tenant: string;
  namespace: string;
};

const Policies: React.FC<PoliciesProps> = (props) => {
  return (
    <div className={s.Policies}>
      <ConfigurationTable
        fields={[
          clustersField({ tenant: props.tenant, namespace: props.namespace }),
          subscriptionTypesEnabledField({ tenant: props.tenant, namespace: props.namespace }),
          backlogQuotaField({ tenant: props.tenant, namespace: props.namespace }),
        ]}
      />
    </div>
  );
}

export default Policies;
