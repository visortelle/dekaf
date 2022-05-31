import React from 'react';
import s from './NamespacePage.module.css'

export type NamespacePageProps = {};

const NamespacePage: React.FC<NamespacePageProps> = (props) => {
  return (
    <div className={s.TenantPage}>namespace page</div>
  );
}

export default NamespacePage;
