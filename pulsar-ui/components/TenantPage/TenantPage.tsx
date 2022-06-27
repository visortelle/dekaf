import React from 'react';
import { BreadCrumbsAtPageTop } from '../ui/BreadCrumbs/BreadCrumbs';
import s from './TenantPage.module.css'
import Configuration from './Configuration/Configuration';
import Overview from './Overview/Overview';
import Namespaces from './Namespaces/Namespaces';
import DeleteTenant from './DeleteTenant/DeleteTenant';
import CreateNamespace from './CreateNamespace/CreateNamespace';
import Toolbar from '../ui/Toolbar/Toolbar';
import { routes } from '../routes';

export type TenantPageView = 'overview' | 'namespaces' | 'configuration' | 'delete-tenant' | 'create-namespace';
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
            id: `instance`,
            value: 'Pulsar Instance',
            type: 'instance',
          },
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
              linkTo: routes.tenants.tenant.namespaces._.get({ tenant: props.tenant }),
              title: 'Namespaces',
              onClick: () => { },
              type: 'regular'
            },
            {
              linkTo: routes.tenants.tenant.configuration._.get({ tenant: props.tenant }),
              title: 'Configuration',
              onClick: () => { },
              type: 'regular'
            },
            {
              linkTo: routes.tenants.tenant.deleteTenant._.get({ tenant: props.tenant }),
              title: 'Delete',
              onClick: () => { },
              type: 'danger'
            },
            {
              linkTo: routes.tenants.tenant.createNamespace._.get({ tenant: props.tenant }),
              title: 'Create namespace',
              onClick: () => { },
              type: 'primary',
              position: 'right'
            }
          ]}
        />
      </div>

      {props.view === 'overview' && <Overview />}
      {props.view === 'namespaces' && <Namespaces tenant={props.tenant} />}
      {props.view === 'configuration' && <Configuration tenant={props.tenant} />}
      {props.view === 'delete-tenant' && <DeleteTenant tenant={props.tenant} />}
      {props.view === 'create-namespace' && <CreateNamespace />}
    </div>
  );
}

export default TenantPage;
