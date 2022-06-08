import React from 'react';
import { BreadCrumbsAtPageTop } from '../BreadCrumbs/BreadCrumbs';
import s from './TenantPage.module.css'
import Button from '../ui/Button/Button';
import Configuration from './Configuration/Configuration';
import Namespaces from './Namespaces/Namespaces';
import DeleteTenant from './DeleteTenant/DeleteTenant';
import CreateNamespace from './CreateNamespace/CreateNamespace';
import { Link } from 'react-router-dom';

export type TenantPageView = 'namespaces' | 'configuration' | 'delete-tenant' | 'create-namespace';
export type TenantPageProps = {
  view: TenantPageView;
  tenant: string;
};

const TenantPage: React.FC<TenantPageProps> = (props) => {
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
            <Link to={`/tenants/${props.tenant}`}>
              <Button
                title='Namespaces'
                onClick={() => undefined}
                type={'regular'}
              />
            </Link>
          </div>
          <div className={s.ToolbarButton}>
            <Link to={`/tenants/${props.tenant}/configuration`}>
              <Button
                title='Configuration'
                onClick={() => undefined}
                type={'regular'}
              />
            </Link>
          </div>
          <Link to={`/tenants/${props.tenant}/delete-tenant`}>
            <div className={s.ToolbarButton}>
              <Button
                title='Delete'
                onClick={() => undefined}
                type={'danger'}
              />
            </div>
          </Link>
          <div className={s.ToolbarActionButton}>
            <Link to={`/tenants/${props.tenant}/create-namespace`}>
              <Button
                title='Create namespace'
                onClick={() => undefined}
                type={'primary'}
              />
            </Link>
          </div>
        </div>
      </div>

      {props.view === 'namespaces' && <Namespaces />}
      {props.view === 'configuration' && <Configuration tenant={props.tenant} />}
      {props.view === 'delete-tenant' && <DeleteTenant tenant={props.tenant} />}
      {props.view === 'create-namespace' && <CreateNamespace />}
    </div>
  );
}

export default TenantPage;
