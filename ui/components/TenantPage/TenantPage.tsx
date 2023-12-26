import React from 'react';

import { useNavigate } from 'react-router-dom';
import * as Modals from '../app/contexts/Modals/Modals';
import Toolbar from '../ui/Toolbar/Toolbar';
import { BreadCrumbsAtPageTop, Crumb } from '../ui/BreadCrumbs/BreadCrumbs';
import Overview from './Overview/Overview';
import Namespaces from './Namespaces/Namespaces';
import DeleteDialog from './DeleteDialog/DeleteDialog';
import CreateNamespace from './CreateNamespace/CreateNamespace';
import { routes } from '../routes';
import { matchPath, useLocation } from 'react-router-dom';

import s from './TenantPage.module.css'
import { LibraryContext } from '../ui/LibraryBrowser/model/library-context';

export type TenantPageView = 'overview' | 'namespaces' | 'create-namespace';
export type TenantPageProps = {
  view: TenantPageView;
  tenant: string;
};

const TenantPage: React.FC<TenantPageProps> = (props) => {
  const modals = Modals.useContext();
  const navigate = useNavigate()

  const { pathname } = useLocation();
  let extraCrumbs: Crumb[] = [];
  if (matchPath(routes.tenants.tenant.overview._.path, pathname)) {
    extraCrumbs = [{ type: 'link', id: 'overview', value: 'Overview' }]
  } else if (matchPath(routes.tenants.tenant.namespaces._.path, pathname)) {
    extraCrumbs = [{ type: 'link', id: 'namespaces', value: 'Namespaces' }]
  } else if (matchPath(routes.tenants.tenant.createNamespace._.path, pathname)) {
    extraCrumbs = [{ type: 'link', id: 'create-namespace', value: 'New Namespace' }]
  }

  const libraryContext: LibraryContext = {
    pulsarResource: {
      type: 'tenant',
      tenant: props.tenant,
    }
  };

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
          },
          ...extraCrumbs,
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
              active: Boolean(matchPath(routes.tenants.tenant.overview._.path, pathname))
            },
            {
              linkTo: routes.tenants.tenant.namespaces._.get({ tenant: props.tenant }),
              text: 'Namespaces',
              onClick: () => { },
              type: 'regular',
              active: Boolean(matchPath(routes.tenants.tenant.namespaces._.path, pathname))
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
              linkTo: '',
              text: "Produce",
              onClick: () => { },
              type: "regular",
              position: "right",
              active: false
            },
            {
              linkTo: '',
              text: "Consume",
              onClick: () => { },
              type: "regular",
              position: "right",
              active: Boolean(matchPath(routes.tenants.tenant.namespaces.namespace.topics.anyTopicPersistency.topic.consumerSession._.path, pathname))
            },
            {
              linkTo: routes.tenants.tenant.createNamespace._.get({ tenant: props.tenant }),
              text: 'Create Namespace',
              onClick: () => { },
              type: 'primary',
              position: 'right',
              active: Boolean(matchPath(routes.tenants.tenant.createNamespace._.path, pathname))
            }
          ]}
        />
      </div>

      {props.view === 'namespaces' && <Namespaces tenant={props.tenant} />}
      {props.view === 'overview' && <Overview tenant={props.tenant} libraryContext={libraryContext} />}
      {props.view === 'create-namespace' && <CreateNamespace tenant={props.tenant} />}
    </div>
  );
}

export default TenantPage;
