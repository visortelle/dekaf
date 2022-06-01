import React from 'react';
import { BreadCrumbsAtPageTop } from '../BreadCrumbs/BreadCrumbs';
import s from './TenantPage.module.css'
import Button from '../ui/Button/Button';
import Configuration from './Configuration/Configuration';
import Namespaces from './Namespaces/Namespaces';
import DeleteTenant from './DeleteTenant/DeleteTenant';
import CreateNamespace from './CreateNamespace/CreateNamespace';

export type TenantPageProps = {
  tenant: string;
};

const TenantPage: React.FC<TenantPageProps> = (props) => {
  const [view, setView] = React.useState<'namespaces' | 'configuration' | 'delete-tenant' | 'create-namespace'>('namespaces');

  return (
    <div className={s.Page}>
      <BreadCrumbsAtPageTop
        crumbs={[
          {
            id: `tenant-${props.tenant}`,
            value: props.tenant,
            type: 'tenant',
          }
        ]}
      />

      <div className={s.PageContent}>
        <div className={s.Toolbar}>
          <div className={s.ToolbarButton}>
            <Button
              title='Namespaces'
              onClick={() => setView('namespaces')}
              type={'regular'}
            />
          </div>
          <div className={s.ToolbarButton}>
            <Button
              title='Configuration'
              onClick={() => setView('configuration')}
              type={'regular'}
            />
          </div>
          <div className={s.ToolbarButton}>
            <Button
              title='Delete'
              onClick={() => setView('delete-tenant')}
              type={'danger'}
            />
          </div>
          <div className={s.ToolbarActionButton}>
            <Button
              title='Create namespace'
              onClick={() => setView('create-namespace')}
              type={'primary'}
            />
          </div>
        </div>
      </div>
      {view === 'namespaces' && <Namespaces />}
      {view === 'configuration' && <Configuration />}
      {view === 'delete-tenant' && <DeleteTenant tenant={props.tenant} />}
      {view === 'create-namespace' && <CreateNamespace />}
    </div>
  );
}

export default TenantPage;
