import React from 'react';
import s from './InstancePage.module.css'
import Overview from './Overview/Overview';
import Configuration from './Configuration/Configuration';
import Toolbar from '../ui/Toolbar/Toolbar';
import { routes } from '../routes';
import Tenants from './Tenants/Tenants';
import CreateTenant from './CreateTenant/CreateTenant';
import { BreadCrumbsAtPageTop } from '../ui/BreadCrumbs/BreadCrumbs';

export type InstancePageView = 'overview' | 'configuration' | 'tenants' | 'create-tenant';
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
              value: 'Pulsar Instance',
              type: 'instance',
            }
          ]}
        />
        <Toolbar
          buttons={[
            {
              linkTo: routes.instance.tenants._.get(),
              title: 'Tenants',
              onClick: () => { },
              type: 'regular',
            },
            {
              linkTo: routes.instance.overview._.get(),
              title: 'Overview',
              onClick: () => { },
              type: 'regular'
            },
            {
              linkTo: routes.instance.configuration._.get(),
              title: 'Configuration',
              onClick: () => { },
              type: 'regular'
            },
            {
              linkTo: routes.instance.createTenant._.get(),
              title: 'Create tenant',
              onClick: () => { },
              type: 'primary',
              position: 'right'
            },
          ]}
        />
      </div>

      {props.view === 'overview' && <Overview />}
      {props.view === 'configuration' && <Configuration />}
      {props.view === 'tenants' && <Tenants />}
      {props.view === 'create-tenant' && <CreateTenant />}
    </div>
  );
}

export default InstancePage;
