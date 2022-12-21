import React from 'react';
import { BreadCrumbsAtPageTop } from '../ui/BreadCrumbs/BreadCrumbs';
import s from './TenantPage.module.css'
import Configuration from './Configuration/Configuration';
import Overview from './Overview/Overview';
import Namespaces from './Namespaces/Namespaces';
import DeleteTenant from './DeleteTenant/DeleteTenant';
import CreateNamespace from './CreateNamespace/CreateNamespace';
import Toolbar from '../ui/Toolbar/Toolbar';
import { routes } from '../routes';

import { DeleteTenantRequest } from '../../grpc-web/tools/teal/pulsar/ui/tenant/v1/tenant_pb';
import { Code } from '../../grpc-web/google/rpc/code_pb';
import { swrKeys } from '../swrKeys';
import * as Modals from '../app/contexts/Modals/Modals';

import * as Notifications from '../app/contexts/Notifications';
import * as PulsarGrpcClient from '../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import { useNavigate } from 'react-router-dom';
import { useSWRConfig } from 'swr';
import ConfirmationDialog from '../ConfirmationDialog/ConfirmationDialog';

export type TenantPageView = 'overview' | 'namespaces' | 'configuration' | 'delete-tenant' | 'create-namespace';
export type TenantPageProps = {
  view: TenantPageView;
  tenant: string;
};

const TenantPage: React.FC<TenantPageProps> = (props) => {

  const modals = Modals.useContext()

  const navigate = useNavigate();
  const { mutate } = useSWRConfig()
  const { notifyError, notifySuccess } = Notifications.useContext();
  const { tenantServiceClient } = PulsarGrpcClient.useContext();

  const [forceDelete, setForceDelete] = React.useState(false);

  const deleteTenant = async () => {
    try {
      const req = new DeleteTenantRequest();
      req.setTenantName(props.tenant);
      req.setForce(forceDelete);
      const res = await tenantServiceClient.deleteTenant(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to delete tenant: ${res.getStatus()?.getMessage()}`);
        return;
      }

      notifySuccess(`Tenant ${props.tenant} has been successfully deleted.`);
      navigate(`/`);

      await mutate(swrKeys.pulsar.tenants._());
      await mutate(swrKeys.pulsar.batch.getTreeNodesChildrenCount._());
    } catch (err) {
      notifyError(`Unable to delete tenant ${props.tenant}. ${err}`)
    }
  };

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
          }
        ]}
      />

      <div className={s.PageContent}>
        <Toolbar
          buttons={[
            {
              linkTo: routes.tenants.tenant.namespaces._.get({ tenant: props.tenant }),
              text: 'Namespaces',
              onClick: () => { },
              type: 'regular'
            },
            {
              linkTo: routes.tenants.tenant.configuration._.get({ tenant: props.tenant }),
              text: 'Configuration',
              onClick: () => { },
              type: 'regular'
            },
            {
              linkTo: routes.tenants.tenant.deleteTenant._.get({ tenant: props.tenant }),
              text: 'Delete',
              type: 'danger',


              onClick: () => modals.push({
                id: 'delete-namespace',
                title: `Delete namespace`,
                content: (
                  
                  <ConfirmationDialog
                    description={
                      <div>
                        <div>This action <strong>cannot</strong> be undone.</div>
                        <br />
                        <div>It will permanently delete the ${props.tenant} tenant and all its namespaces.</div>
                      </div>
                    }
                    onConfirm={deleteTenant} 
                    onCancel={modals.pop}
                    guard={`public/default`}
                  />
                ),
                styleMode: 'no-content-padding'
              }),
            },
            {
              linkTo: routes.tenants.tenant.createNamespace._.get({ tenant: props.tenant }),
              text: 'Create namespace',
              onClick: () => { },
              type: 'primary',
              position: 'right'
            }
          ]}
        />
      </div>

      {props.view === 'overview' && <Overview />}
      {props.view === 'namespaces' && <Namespaces tenant={props.tenant} />}
      {props.view === 'configuration' && <Configuration tenant={props.tenant} />}
      {props.view === 'delete-tenant' && <DeleteTenant tenant={props.tenant} />}
      {props.view === 'create-namespace' && <CreateNamespace tenant={props.tenant} />}
    </div>
  );
}

export default TenantPage;
