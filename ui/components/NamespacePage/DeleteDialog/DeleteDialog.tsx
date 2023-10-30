import React from 'react';
import { NavigateFunction } from 'react-router-dom';
import { mutate, useSWRConfig } from 'swr';

import * as Notifications from '../../app/contexts/Notifications';
import * as GrpcClient from '../../app/contexts/GrpcClient/GrpcClient';
import * as Modals from '../../app/contexts/Modals/Modals';
import { DeleteNamespaceRequest } from '../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb';
import { Code } from '../../../grpc-web/google/rpc/code_pb';
import ConfirmationDialog from '../../ui/ConfirmationDialog/ConfirmationDialog';
import { swrKeys } from '../../swrKeys';
import { routes } from '../../routes';

export type DeleteNamespaceProps = {
  tenant: string,
  namespace: string,
  navigate: NavigateFunction,
};

const DeleteNamespace: React.FC<DeleteNamespaceProps> = (props) => {
  const modals = Modals.useContext();
  const { mutate } = useSWRConfig()
  const { notifyError, notifySuccess } = Notifications.useContext();
  const { namespaceServiceClient } = GrpcClient.useContext();
  const [forceDelete, setForceDelete] = React.useState(false);

  const switchForceDelete = () => {
    setForceDelete(!forceDelete);
  }

  const deleteNamespace = async () => {
    try {
      const req = new DeleteNamespaceRequest();
      req.setNamespaceName(`${props.tenant}/${props.namespace}`);
      req.setForce(forceDelete);
      const res = await namespaceServiceClient.deleteNamespace(req, {});
      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to delete namespace: ${res.getStatus()?.getMessage()}`);
        return;
      }

      notifySuccess(`Namespace ${props.tenant}/${props.namespace} has been successfully deleted.`);

      await mutate(swrKeys.pulsar.tenants.tenant.namespaces._({ tenant: props.tenant }));

      props.navigate(routes.tenants.tenant.namespaces._.get({ tenant: props.tenant }));
      modals.pop();
    } catch (err) {
      notifyError(`Unable to delete namespace ${props.tenant}/${props.namespace}. ${err}`)
    }
  };

  return (
    <ConfirmationDialog
      description={
        <div>
          <div>This action <strong>cannot</strong> be undone.</div>
          <br />
          <div>It will permanently delete the <strong>{props.namespace}</strong> namespace and all its topics.</div>
        </div>
      }
      forceDelete={forceDelete}
      switchForceDelete={switchForceDelete}
      forceDeleteInfo="Delete namespace forcefully by deleting all topics under it."
      onConfirm={deleteNamespace}
      onCancel={modals.pop}
      guard={props.namespace}
      type='danger'
    />
  );
}

export default DeleteNamespace;
