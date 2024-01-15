import React from 'react';
import s from './InstancePage.module.css'
import Overview from './Overview/Overview';
import Configuration from './Configuration/Configuration';
import Toolbar from '../ui/Toolbar/Toolbar';
import { routes } from '../routes';
import Tenants from './Tenants/Tenants';
import CreateTenantPage from './CreateTenantPage/CreateTenantPage';
import { BreadCrumbsAtPageTop, Crumb } from '../ui/BreadCrumbs/BreadCrumbs';
import ResourceGroups from './ResourceGroups/ResourceGroups';
import { matchPath, useLocation } from 'react-router-dom';
import ConsumerSession from '../ui/ConsumerSession/ConsumerSession';
import { LibraryContext } from '../ui/LibraryBrowser/model/library-context';
import { getDefaultManagedItem } from '../ui/LibraryBrowser/default-library-items';
import { ManagedConsumerSessionConfig } from '../ui/LibraryBrowser/model/user-managed-items';

export type InstancePageView =
  { type: 'overview' } |
  { type: 'configuration' } |
  { type: 'tenants' } |
  { type: 'create-tenant' } |
  { type: 'resource-groups' } |
  { type: 'create-resource-group' } |
  { type: 'edit-resource-group', groupName: string } |
  {
    type: 'consumer-session',
    managedConsumerSessionId: string | undefined
  };

export type InstancePageProps = {
  view: InstancePageView;
};

const InstancePage: React.FC<InstancePageProps> = (props) => {
  const { pathname } = useLocation();
  let extraCrumbs: Crumb[] = [];
  if (matchPath(routes.instance.overview._.path, pathname)) {
    extraCrumbs = [{ type: 'link', id: 'overview', value: 'Overview' }]
  } else if (matchPath(routes.instance.configuration._.path, pathname)) {
    extraCrumbs = [{ type: 'link', id: 'configuration', value: 'Configuration' }]
  } else if (matchPath(routes.instance.tenants._.path, pathname)) {
    extraCrumbs = [{ type: 'link', id: 'tenants', value: 'Tenants' }]
  } else if (matchPath(routes.instance.createTenant._.path, pathname)) {
    extraCrumbs = [{ type: 'link', id: 'create-tenant', value: 'Create Tenant' }]
  } else if (matchPath(routes.instance.resourceGroups._.path, pathname)) {
    extraCrumbs = [{ type: 'link', id: 'resource-groups', value: 'Resource Groups' }]
  } else if (matchPath(routes.instance.consumerSession._.path, pathname)) {
    extraCrumbs = [{ type: 'link', id: 'consumer-session', value: 'Consumer Session' }]
  }

  const libraryContext: LibraryContext = { pulsarResource: { type: 'instance' } };

  return (
    <div className={s.Page}>
      <div className={s.PageContent}>
        <BreadCrumbsAtPageTop
          crumbs={[
            {
              id: `instance`,
              type: 'instance',
              value: ''
            },
            ...extraCrumbs
          ]}
        />
        <Toolbar
          buttons={[
            {
              linkTo: routes.instance.overview._.get(),
              text: 'Overview',
              onClick: () => { },
              type: 'regular',
              active: Boolean(matchPath(routes.instance.overview._.path, pathname))
            },
            {
              linkTo: routes.instance.tenants._.get(),
              text: 'Tenants',
              onClick: () => { },
              type: 'regular',
              active: Boolean(matchPath(routes.instance.tenants._.path, pathname))
            },
            {
              linkTo: routes.instance.configuration._.get(),
              text: 'Configuration',
              onClick: () => { },
              type: 'regular',
              active: Boolean(matchPath(routes.instance.configuration._.path, pathname))
            },
            {
              linkTo: routes.instance.resourceGroups._.get(),
              text: 'Resource Groups',
              onClick: () => { },
              type: 'regular',
              active: Boolean(matchPath(routes.instance.resourceGroups._.path, pathname))
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
              linkTo: routes.instance.createTenant._.get(),
              text: 'Create Tenant',
              onClick: () => { },
              type: 'primary',
              position: 'right',
              active: Boolean(matchPath(routes.instance.createTenant._.path, pathname))
            },
          ]}
        />
      </div>

      {props.view.type === 'tenants' && <Tenants />}
      {props.view.type === 'overview' && <Overview />}
      {props.view.type === 'configuration' && <Configuration />}
      {props.view.type === 'create-tenant' && <CreateTenantPage />}
      {props.view.type === 'resource-groups' && <ResourceGroups view={{ type: 'show-all-groups' }} />}
      {props.view.type === 'create-resource-group' && <ResourceGroups view={{ type: 'create' }} />}
      {props.view.type === 'edit-resource-group' && <ResourceGroups view={{ type: 'edit', groupName: props.view.groupName }} />}
      {props.view.type === "consumer-session" && (
        <ConsumerSession
          key={props.view.managedConsumerSessionId}
          libraryContext={libraryContext}
          initialConfig={props.view.managedConsumerSessionId === undefined ? {
            type: 'value',
            val: getDefaultManagedItem("consumer-session-config", libraryContext) as ManagedConsumerSessionConfig
          } : {
            type: 'reference',
            ref: props.view.managedConsumerSessionId
          }}
        />
      )}
    </div>
  );
}

export default InstancePage;
