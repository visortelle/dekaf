import React from 'react';
import { mutate } from 'swr';

import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import * as Notifications from '../../../app/contexts/Notifications';
import * as GrpcClient from '../../../app/contexts/GrpcClient/GrpcClient';
import * as Modals from '../../../app/contexts/Modals/Modals';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/namespace/v1/namespace_pb';
import ConfirmationDialog from '../../../ui/ConfirmationDialog/ConfirmationDialog';

type Props = {
  tenant: string,
  namespace: string,
  role: string,
  swrKey: string[],
}

const RevokeDialog = (props: Props) => {

  const modals = Modals.useContext();
  const { notifySuccess, notifyError } = Notifications.useContext();
  const { namespaceServiceClient } = GrpcClient.useContext();

  const revoke = async () => {
    const req = new pb.RevokePermissionsRequest();
    req.setNamespace(`${props.tenant}/${props.namespace}`);
    req.setRole(props.role);

    const res = await namespaceServiceClient.revokePermissions(req, {});

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(res.getStatus()?.getMessage());
      return;
    }

    notifySuccess(
      <span>Successfully revoked permissions for role: <strong>{props.role}</strong></span>,
      `permission-revoked-${props.role}`
    );

    await mutate(props.swrKey);
    modals.pop();
  }

  return (
    <ConfirmationDialog
      content={
        <div>
          <div>This action <strong>cannot</strong> be undone.</div>
          <br />
          <div>It will permanently revoke permissions for the <strong>{props.role}</strong> role.</div>
        </div>
      }
      onConfirm={revoke}
      onCancel={modals.pop}
      type='danger'
    />
  );
}

export default RevokeDialog
