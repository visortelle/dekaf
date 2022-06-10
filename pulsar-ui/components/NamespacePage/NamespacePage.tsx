import React from 'react';
import { BreadCrumbsAtPageTop } from '../BreadCrumbs/BreadCrumbs';
import s from './NamespacePage.module.css'
import Toolbar from '../ui/Toolbar/Toolbar';
import Policies from './Policies/Policies';

export type NamespacePageView = 'overview' | 'policies' | 'delete-namespace' | 'create-topic';
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
            linkTo: `/tenants/${props.tenant}/namespaces/${props.namespace}`,
            title: 'Overview',
            onClick: () => { },
            type: 'regular'
          },
          {
            linkTo: `/tenants/${props.tenant}/namespaces/${props.namespace}/policies`,
            title: 'Policies',
            onClick: () => { },
            type: 'regular'
          },
          {
            linkTo: `/tenants/${props.tenant}/namespaces/${props.namespace}/delete-namespace`,
            title: 'Delete',
            onClick: () => { },
            type: 'danger'
          },
          {
            linkTo: `/tenants/${props.tenant}/namespaces/${props.namespace}/create-topic`,
            title: 'Create topic',
            onClick: () => { },
            type: 'primary',
            position: 'right'
          }
        ]}
      />

      {props.view === 'policies' && <Policies tenant={props.tenant} namespace={props.namespace} />}
    </div>
  );
}

export default NamespacePage;
