import React from 'react';
import { useNavigate } from 'react-router';

import Topics from './Topics/Topics';
import Policies from './Policies/Policies';
import CreateTopic from './CreateTopic/CreateTopic';
import Permissions from './Permissions/Permissions';
import DeleteDialog from './DeleteDialog/DeleteDialog'
import SubscriptionPermissions from './SubscriptionPermissions/SubscriptionPermissions';
import { BreadCrumbsAtPageTop } from '../ui/BreadCrumbs/BreadCrumbs';
import Toolbar from '../ui/Toolbar/Toolbar';
import * as Modals from '../app/contexts/Modals/Modals';
import { routes } from '../routes';

import s from './NamespacePage.module.css'

export type NamespacePageView = 'topics' | 'policies' | 'permissions' | 'subscription-permissions' | 'create-topic';
export type NamespacePageProps = {
  view: NamespacePageView;
  tenant: string;
  namespace: string;
};

const NamespacePage: React.FC<NamespacePageProps> = (props) => {

  const modals = Modals.useContext();

  const navigate = useNavigate();

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
          }
        ]}
      />
      <Toolbar
        buttons={[
          {
            linkTo: routes.tenants.tenant.namespaces.namespace.topics._.get({ tenant: props.tenant, namespace: props.namespace }),
            text: 'Topics',
            onClick: () => { },
            type: 'regular'
          },
          {
            linkTo: routes.tenants.tenant.namespaces.namespace.permissions._.get({ tenant: props.tenant, namespace: props.namespace }),
            text: 'Permissions',
            onClick: () => { },
            type: 'regular'
          },
          {
            linkTo: routes.tenants.tenant.namespaces.namespace.subscriptionPermissions._.get({ tenant: props.tenant, namespace: props.namespace }),
            text: 'Subscription Permissions',
            onClick: () => { },
            type: 'regular'
          },
          {
            linkTo: routes.tenants.tenant.namespaces.namespace.policies._.get({ tenant: props.tenant, namespace: props.namespace }),
            text: 'Policies',
            onClick: () => { },
            type: 'regular'
          },
          {
            text: 'Delete',
            type: 'danger',
            onClick: () => modals.push({
              id: 'delete-namepsace',
              title: `Delete namespace`,
              content: <DeleteDialog tenant={props.tenant} namespace={props.namespace} navigate={navigate} />,
              styleMode: 'no-content-padding'
            }),
            testId: "namespace-page-delete-button"
          },
          {
            linkTo: routes.tenants.tenant.namespaces.namespace.createTopic._.get({ tenant: props.tenant, namespace: props.namespace }),
            text: 'New topic',
            onClick: () => { },
            type: 'primary',
            position: 'right'
          }
        ]}
      />

      {props.view === 'topics' && <Topics tenant={props.tenant} namespace={props.namespace} />}
      {props.view === 'policies' && <Policies tenant={props.tenant} namespace={props.namespace} />}
      {props.view === 'permissions' && <Permissions tenant={props.tenant} namespace={props.namespace} />}
      {props.view === 'subscription-permissions' && <SubscriptionPermissions tenant={props.tenant} namespace={props.namespace} />}
      {props.view === 'create-topic' && <CreateTopic tenant={props.tenant} namespace={props.namespace} />}
    </div>
  );
}

export default NamespacePage;
