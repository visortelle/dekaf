import React from 'react';
import { BreadCrumbsAtPageTop } from '../BreadCrumbs/BreadCrumbs';
import s from './TenantPage.module.css'
import Configuration from './Configuration/Configuration';
import Namespaces from './Overview/Overview';
import DeleteTenant from './DeleteTenant/DeleteTenant';
import CreateNamespace from './CreateNamespace/CreateNamespace';
import Toolbar from '../ui/Toolbar/Toolbar';

export type TenantPageView = 'overview' | 'configuration' | 'delete-tenant' | 'create-namespace';
export type TenantPageProps = {
  view: TenantPageView;
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

      <div className={s.PageContent}>
        <Toolbar
          buttons={[
            {
              linkTo: `/tenants/${props.tenant}`,
              title: 'Overview',
              onClick: () => { },
              type: 'regular'
            },
            {
              linkTo: `/tenants/${props.tenant}/configuration`,
              title: 'Configuration',
              onClick: () => { },
              type: 'regular'
            },
            {
              linkTo: `/tenants/${props.tenant}/delete-tenant`,
              title: 'Delete',
              onClick: () => { },
              type: 'danger'
            },
            {
              linkTo: `/tenants/${props.tenant}/create-namespace`,
              title: 'Create namespace',
              onClick: () => { },
              type: 'primary',
              position: 'right'
            }
          ]}
        />
      </div>

      {props.view === 'overview' && <Namespaces />}
      {props.view === 'configuration' && <Configuration tenant={props.tenant} />}
      {props.view === 'delete-tenant' && <DeleteTenant tenant={props.tenant} />}
      {props.view === 'create-namespace' && <CreateNamespace />}
    </div>
  );
}

export default TenantPage;
