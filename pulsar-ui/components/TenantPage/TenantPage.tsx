import React from 'react';
import { BreadCrumbsAtPageTop } from '../BreadCrumbs/BreadCrumbs';
import s from './TenantPage.module.css'

export type TenantPageProps = {
  tenant: string;
};

const TenantPage: React.FC<TenantPageProps> = (props) => {
  return (
    <div className={s.Page}>
      <BreadCrumbsAtPageTop
        crumbs={[
          {
            id: `tenant-${props.tenant}`,
            value: props.tenant,
            type: 'tenant',
          }
        ]}
      />

      tenant page
    </div>
  );
}

export default TenantPage;
