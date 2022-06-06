import React from 'react';
import s from './Configuration.module.css'
import ConfigurationTable, { BooleanValue, ConfigurationField, ListValue, NumberValue, OneOfValue, StringValue, Value } from '../../ConfigurationTable/ConfigurationTable';
import * as Either from 'fp-ts/Either';

export type ConfigurationProps = {};

type AdminRolesValue = ListValue<string>;
type ClustersValue = OneOfValue;

const Configuration: React.FC<ConfigurationProps> = (props) => {
  const [adminRoles, setAdminRoles] = React.useState<AdminRolesValue>({ type: 'list', value: [] });
  const [clusters, setClusters] = React.useState<ClustersValue>({ type: 'oneOf', value: { type: 'list', value: [] }, options: [] });

  const adminRolesField: ConfigurationField<AdminRolesValue> = {
    id: "adminRoles",
    title: "Admin roles",
    description: "Roles that can manage the tenant",
    value: adminRoles,
    isValid: (value: AdminRolesValue) => Either.right(undefined),
    onChange: (value: AdminRolesValue) => Promise.resolve(),
  }

  const allowedClustersField: ConfigurationField<ClustersValue> = {
    id: "allowedClusters",
    title: "Allowed clusters",
    description: "Roles that can manage the tenant",
    value: clusters,
    isValid: (value: ClustersValue) => Either.right(undefined),
    onChange: (value: ClustersValue) => Promise.resolve(),
  }

  return (
    <div className={s.Configuration} >
      <ConfigurationTable
        fields={[
          adminRolesField,
          allowedClustersField
        ]}
      />
    </div >
  );
}

export default Configuration;
