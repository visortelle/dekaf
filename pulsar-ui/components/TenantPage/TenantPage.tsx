import React from 'react';
import { BreadCrumbsAtPageTop } from '../BreadCrumbs/BreadCrumbs';
import s from './TenantPage.module.css'
import Button from '../ui/Button/Button';

export type TenantPageProps = {
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
            <Button
              title='Namespaces'
              onClick={() => undefined}
              type={'regular'}
            />
          </div>
          <div className={s.ToolbarButton}>
            <Button
              title='Configuration'
              onClick={() => undefined}
              type={'regular'}
            />
          </div>
          <div className={s.ToolbarButton}>
            <Button
              title='Delete'
              onClick={() => undefined}
              type={'danger'}
            />
          </div>
          <div className={s.ToolbarActionButton}>
            <Button
              title='Create namespace'
              onClick={() => undefined}
              type={'primary'}
            />
          </div>
        </div>
      </div>
      tenant page
    </div>
  );
}

export default TenantPage;
