import React from 'react';

import Toolbar from '../../ui/Toolbar/Toolbar';
import { BreadCrumbsAtPageTop } from '../../ui/BreadCrumbs/BreadCrumbs';
import Sinks from './Sinks/Sinks';
import Sources from './Sources/Sources';
import CreateSink from './Sinks/CreateSink/CreateSink';
import EditSink from './Sinks/EditSink/EditSink';
import { routes } from '../../routes';

import s from './IoPage.module.css'
import CreateSource from './Sources/CreateSource/CreateSource';
import EditSource from './Sources/EditSource/EditSource';

export type IoPageView = 'sinks' | 'sinks-create' | 'sinks-edit' | 'sources' | 'sources-create' | 'sources-edit';

export type IoPageProps = {
  tenant: string;
  namespace: string;
  view: IoPageView;

  sink?: string;
  source?: string,
};

const IoPage: React.FC<IoPageProps> = (props) => {

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
          {
            id: `io`,
            value: 'Io',
            type: 'io',
          },
        ]}
      />

      <Toolbar
        buttons={[
          {
            linkTo: routes.tenants.tenant.namespaces.namespace.io.sinks._.get({ tenant: props.tenant, namespace: props.namespace }),
            text: 'Sinks',
            onClick: () => { },
            type: 'regular'
          },
          {
            linkTo: routes.tenants.tenant.namespaces.namespace.io.sources._.get({ tenant: props.tenant, namespace: props.namespace }),
            text: 'Sources',
            onClick: () => { },
            type: 'regular'
          },
          props.view === 'sinks' || props.view === 'sinks-create' || props.view === 'sinks-edit' ?
          {
            linkTo: routes.tenants.tenant.namespaces.namespace.io.sinks.create._.get({ tenant: props.tenant, namespace: props.namespace }),
            text: 'Create sink',
            onClick: () => { },
            type: 'primary',
            position: 'right'
          } : {
            linkTo: routes.tenants.tenant.namespaces.namespace.io.sources.create._.get({ tenant: props.tenant, namespace: props.namespace }),
            text: 'Create source',
            onClick: () => { },
            type: 'primary',
            position: 'right'
          },
        ]}
      />
      
      {props.view === 'sinks' && <Sinks tenant={props.tenant} namespace={props.namespace} />}
      {props.view === 'sinks-create' && <CreateSink tenant={props.tenant} namespace={props.namespace} />}
      {props.view === 'sinks-edit' && props.sink && <EditSink tenant={props.tenant} namespace={props.namespace} sink={props.sink} />}
      {props.view === 'sources' && <Sources tenant={props.tenant} namespace={props.namespace} />}
      {props.view === 'sources-create' && <CreateSource tenant={props.tenant} namespace={props.namespace} />}
      {props.view === 'sources-edit' && props.source && <EditSource tenant={props.tenant} namespace={props.namespace} source={props.source} />}
    </div>
  );
}

export default IoPage;
