import React from 'react';
import s from './InstancePage.module.css'
import Overview from './Overview/Overview';
import Configuration from './Configuration/Configuration';
import Toolbar from '../ui/Toolbar/Toolbar';
import { routes } from '../routes';
import Tenants from './Tenants/Tenants';
import CreateTenantPage from './CreateTenantPage/CreateTenantPage';
import { BreadCrumbsAtPageTop } from '../ui/BreadCrumbs/BreadCrumbs';
import ResourceGroups from './ResourceGroups/ResourceGroups';
import KeyValueEditor from '../ui/KeyValueEditor/KeyValueEditor';

export type InstancePageView =
  { type: 'overview' } |
  { type: 'configuration' } |
  { type: 'tenants' } |
  { type: 'create-tenant' } |
  { type: 'resource-groups' } |
  { type: 'create-resource-group' } |
  { type: 'edit-resource-group', groupName: string };

export type InstancePageProps = {
  view: InstancePageView;
};

const InstancePage: React.FC<InstancePageProps> = (props) => {
  return (
    <div className={s.Page}>
      <div className={s.PageContent}>
        <BreadCrumbsAtPageTop
          crumbs={[
            {
              id: `instance`,
              value: 'Pulsar',
              type: 'instance',
            }
          ]}
        />
        <Toolbar
          buttons={[
            {
              linkTo: routes.instance.tenants._.get(),
              text: 'Tenants',
              onClick: () => { },
              type: 'regular',
            },
            {
              linkTo: routes.instance.overview._.get(),
              text: 'Overview',
              onClick: () => { },
              type: 'regular'
            },
            {
              linkTo: routes.instance.configuration._.get(),
              text: 'Configuration',
              onClick: () => { },
              type: 'regular'
            },
            {
              linkTo: routes.instance.resourceGroups._.get(),
              text: 'Resource groups',
              onClick: () => { },
              type: 'regular'
            },
            {
              linkTo: routes.instance.createTenant._.get(),
              text: 'New tenant',
              onClick: () => { },
              type: 'primary',
              position: 'right'
            },
          ]}
        />
      </div>

      {props.view.type === 'overview' && <Overview />}
      {props.view.type === 'configuration' && <Configuration />}
      {props.view.type === 'tenants' && <Tenants />}
      {props.view.type === 'create-tenant' && <CreateTenantPage />}
      {props.view.type === 'resource-groups' && <ResourceGroups view={{ type: 'show-all-groups' }} />}
      {props.view.type === 'create-resource-group' && <ResourceGroups view={{ type: 'create' }} />}
      {props.view.type === 'edit-resource-group' && <ResourceGroups view={{ type: 'edit', groupName: props.view.groupName }} />}
    </div>
  );
}

export default InstancePage;
