import React from 'react';
import s from './TenantPage.module.css'

export type TenantPageProps = {};

const TenantPage: React.FC<TenantPageProps> = (props) => {
  return (
    <div className={s.TenantPage}>tenant page</div>
  );
}

export default TenantPage;
