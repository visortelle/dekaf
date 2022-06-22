import React from 'react';
import s from './CreateTenant.module.css'

export type CreateTenantProps = {};

const CreateTenant: React.FC<CreateTenantProps> = (props) => {
  return (
    <div className={s.CreateTenant}>Create tenant</div>
  );
}

export default CreateTenant;
