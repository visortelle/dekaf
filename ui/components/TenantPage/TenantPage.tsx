import React from 'react';

import { useNavigate } from 'react-router-dom';
import * as Modals from '../app/contexts/Modals/Modals';
import Toolbar from '../ui/Toolbar/Toolbar';
import { BreadCrumbsAtPageTop } from '../ui/BreadCrumbs/BreadCrumbs';
import Overview from './Overview/Overview';
import Namespaces from './Namespaces/Namespaces';
import DeleteDialog from './DeleteDialog/DeleteDialog';
import CreateNamespace from './CreateNamespace/CreateNamespace';
import { routes } from '../routes';

import s from './TenantPage.module.css'

export type TenantPageView = 'overview' | 'namespaces' | 'create-namespace';
export type TenantPageProps = {
  view: TenantPageView;
  tenant: string;
};

const TenantPage: React.FC<TenantPageProps> = (props) => {
  const modals = Modals.useContext();
  const navigate = useNavigate()

  return (
    <div className={s.Page}>
      <BreadCrumbsAtPageTop
        crumbs={[
          {
            id: `instance`,
            value: 'Pulsar',
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
              linkTo: routes.tenants.tenant.overview._.get({ tenant: props.tenant }),
              text: 'Overview',
              onClick: () => { },
              type: 'regular',
            },
            {
              linkTo: routes.tenants.tenant.namespaces._.get({ tenant: props.tenant }),
              text: 'Namespaces',
              onClick: () => { },
              type: 'regular',
            },
            {
              text: 'Delete',
              type: 'danger',
              onClick: () => modals.push({
                id: 'delete-tenant',
                title: `Delete Tenant`,
                content: <DeleteDialog tenant={props.tenant} navigate={navigate} />,
                styleMode: 'no-content-padding'
              }),
              testId: 'tenant-page-delete-button',
            },
            {
              linkTo: routes.tenants.tenant.createNamespace._.get({ tenant: props.tenant }),
              text: 'New Namespace',
              onClick: () => { },
              type: 'primary',
              position: 'right',
            }
          ]}
        />
      </div>

      {props.view === 'overview' && <Overview tenant={props.tenant} />}
      {props.view === 'namespaces' && <Namespaces tenant={props.tenant} />}
      {props.view === 'create-namespace' && <CreateNamespace tenant={props.tenant} />}
    </div>
  );
}

export default TenantPage;
