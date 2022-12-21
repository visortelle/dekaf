import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSWRConfig } from 'swr';

import * as Modals from '../../app/contexts/Modals/Modals';
import * as Notifications from '../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import { DeleteTenantRequest } from '../../../grpc-web/tools/teal/pulsar/ui/tenant/v1/tenant_pb';
import { Code } from '../../../grpc-web/google/rpc/code_pb';
import { swrKeys } from '../../swrKeys';
import ConfirmationDialog from '../../ConfirmationDialog/ConfirmationDialog';

export type DeleteTenantProps = {
  tenant: string
};

const DeleteDialog: React.FC<DeleteTenantProps> = (props) => {
  const { mutate } = useSWRConfig();
  const { notifyError, notifySuccess } = Notifications.useContext();
  const { tenantServiceClient } = PulsarGrpcClient.useContext();
  const [forceDelete, setForceDelete] = React.useState(false);

  const modals = Modals.useContext();

  const deleteTenant = async () => {
    try {
      const req = new DeleteTenantRequest();
      req.setTenantName(props.tenant);
      req.setForce(forceDelete);
      console.log(props.tenant, forceDelete)
      const res = await tenantServiceClient.deleteTenant(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to delete tenant: ${res.getStatus()?.getMessage()}`);
        return;
      }

      notifySuccess(`Tenant ${props.tenant} has been successfully deleted.`);

      const navigate = useNavigate();
      navigate(`/`);

      await mutate(swrKeys.pulsar.tenants._());
      await mutate(swrKeys.pulsar.batch.getTreeNodesChildrenCount._());
    } catch (err) {
      notifyError(`Unable to delete tenant ${props.tenant}. ${err}`)
    }
  };

  const switchForceDelete = () => {
    setForceDelete(!forceDelete)
  }

  return (
    <ConfirmationDialog
      description={
        <div>
          <div>This action <strong>cannot</strong> be undone.</div>
          <br />
          <div>It will permanently delete the ${props.tenant} tenant and all its namespaces.</div>
        </div>
      }
      forceDelete={forceDelete}
      switchForceDelete={switchForceDelete}
      onConfirm={deleteTenant} 
      onCancel={modals.pop}
      guard={`public/default`}
    />
  );
}

export default DeleteDialog;
