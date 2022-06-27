import React from 'react';
import { BreadCrumbsAtPageTop } from '../ui/BreadCrumbs/BreadCrumbs';
import s from './NamespacePage.module.css'
import Toolbar from '../ui/Toolbar/Toolbar';
import Policies from './Policies/Policies';
import DeleteNamespace from './DeleteNamespace/DeleteNamespace';
import { routes } from '../routes';

export type NamespacePageView = 'topics' | 'policies' | 'delete-namespace' | 'create-topic';
export type NamespacePageProps = {
  view: NamespacePageView;
  tenant: string;
  namespace: string;
};

const NamespacePage: React.FC<NamespacePageProps> = (props) => {
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
            title: 'Topics',
            onClick: () => { },
            type: 'regular'
          },
          {
            linkTo: routes.tenants.tenant.namespaces.namespace.policies._.get({ tenant: props.tenant, namespace: props.namespace }),
            title: 'Policies',
            onClick: () => { },
            type: 'regular'
          },
          {
            linkTo: routes.tenants.tenant.namespaces.namespace.deleteNamespace._.get({ tenant: props.tenant, namespace: props.namespace }),
            title: 'Delete',
            onClick: () => { },
            type: 'danger'
          },
          {
            linkTo: routes.tenants.tenant.namespaces.namespace.createTopic._.get({ tenant: props.tenant, namespace: props.namespace }),
            title: 'Create topic',
            onClick: () => { },
            type: 'primary',
            position: 'right'
          }
        ]}
      />

      {props.view === 'policies' && <Policies tenant={props.tenant} namespace={props.namespace} />}
      {props.view === 'delete-namespace' && <DeleteNamespace tenant={props.tenant} namespace={props.namespace} />}
    </div>
  );
}

export default NamespacePage;
