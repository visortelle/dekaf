import React from 'react';
import { useNavigate } from 'react-router';

import Topics from './Topics/Topics';
import NamespaceDetails from './Details/NamespaceDetails';
import CreateTopic from './CreateTopic/CreateTopic';
import DeleteDialog from './DeleteDialog/DeleteDialog'
import { BreadCrumbsAtPageTop, Crumb } from '../ui/BreadCrumbs/BreadCrumbs';
import Toolbar from '../ui/Toolbar/Toolbar';
import * as Modals from '../app/contexts/Modals/Modals';
import { routes } from '../routes';
import { matchPath, useLocation } from 'react-router-dom';

import s from './NamespacePage.module.css'
import Overview from './Overview/Overview';
import { LibraryContext } from '../ui/LibraryBrowser/model/library-context';
import ConsumerSession from '../ui/ConsumerSession/ConsumerSession';
import { getDefaultManagedItem } from '../ui/LibraryBrowser/default-library-items';
import { ManagedConsumerSessionConfig } from '../ui/LibraryBrowser/model/user-managed-items';

export type NamespacePageView =
  { type: 'overview' } |
  { type: 'topics' } |
  { type: 'policies' } |
  { type: 'create-topic' } |
  {
    type: 'consumer-session',
    managedConsumerSessionId: string | undefined
  };
export type NamespacePageProps = {
  view: NamespacePageView;
  tenant: string;
  namespace: string;
};

const NamespacePage: React.FC<NamespacePageProps> = (props) => {
  const modals = Modals.useContext();
  const navigate = useNavigate();

  const { pathname } = useLocation();
  let extraCrumbs: Crumb[] = [];
  if (matchPath(routes.tenants.tenant.namespaces.namespace.overview._.path, pathname)) {
    extraCrumbs = [{ type: 'link', id: 'overview', value: 'Overview' }]
  } else if (matchPath(routes.tenants.tenant.namespaces.namespace.topics._.path, pathname)) {
    extraCrumbs = [{ type: 'link', id: 'topics', value: 'Topics' }]
  } else if (matchPath(routes.tenants.tenant.namespaces.namespace.policies._.path, pathname)) {
    extraCrumbs = [{ type: 'link', id: 'policies', value: 'Details' }]
  } else if (matchPath(routes.tenants.tenant.namespaces.namespace.createTopic._.path, pathname)) {
    extraCrumbs = [{ type: 'link', id: 'create-topic', value: 'Create Topic' }]
  } else if (matchPath(routes.tenants.tenant.namespaces.namespace.consumerSession._.path, pathname)) {
    extraCrumbs = [{ type: 'link', id: 'consumer-session', value: 'Consumer Session' }]
  }

  const libraryContext: LibraryContext = {
    pulsarResource: {
      type: 'namespace',
      tenant: props.tenant,
      namespace: props.namespace,
    }
  };

  const key = `${props.tenant}-${props.namespace}`;

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
          {
            id: `namespace-${props.namespace}`,
            value: props.namespace,
            type: 'namespace',
          },
          ...extraCrumbs
        ]}
      />
      <Toolbar
        buttons={[
          {
            linkTo: routes.tenants.tenant.namespaces.namespace.overview._.get({ tenant: props.tenant, namespace: props.namespace }),
            text: 'Overview',
            onClick: () => { },
            type: 'regular',
            active: Boolean(matchPath(routes.tenants.tenant.namespaces.namespace.overview._.path, pathname))
          },
          {
            linkTo: routes.tenants.tenant.namespaces.namespace.policies._.get({ tenant: props.tenant, namespace: props.namespace }),
            text: 'Details',
            onClick: () => { },
            type: 'regular',
            active: Boolean(matchPath(routes.tenants.tenant.namespaces.namespace.policies._.path, pathname))
          },
          {
            linkTo: routes.tenants.tenant.namespaces.namespace.topics._.get({ tenant: props.tenant, namespace: props.namespace }),
            text: 'Topics',
            onClick: () => { },
            type: 'regular',
            active: Boolean(matchPath(routes.tenants.tenant.namespaces.namespace.topics._.path, pathname))
          },
          {
            text: 'Delete',
            type: 'danger',
            onClick: () => modals.push({
              id: 'delete-namepsace',
              title: `Delete Namespace`,
              content: <DeleteDialog tenant={props.tenant} namespace={props.namespace} navigate={navigate} />,
              styleMode: 'no-content-padding'
            }),
            testId: "namespace-page-delete-button"
          },
          {
            linkTo: routes.tenants.tenant.namespaces.namespace.createTopic._.get({ tenant: props.tenant, namespace: props.namespace }),
            text: 'Create Topic',
            onClick: () => { },
            type: 'primary',
            position: 'right',
            active: Boolean(matchPath(routes.tenants.tenant.namespaces.namespace.createTopic._.path, pathname))
          }
        ]}
      />

      {props.view.type === 'topics' && <Topics tenant={props.tenant} namespace={props.namespace} />}
      {props.view.type === 'overview' && <Overview tenant={props.tenant} namespace={props.namespace} libraryContext={libraryContext} />}
      {props.view.type === 'policies' && <NamespaceDetails tenant={props.tenant} namespace={props.namespace} />}
      {props.view.type === 'create-topic' && <CreateTopic tenant={props.tenant} namespace={props.namespace} />}
      {props.view.type === "consumer-session" && (
        <ConsumerSession
          key={key + props.view.managedConsumerSessionId}
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

export default NamespacePage;
