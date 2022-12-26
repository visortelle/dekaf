import React from 'react';

import * as Notifications from '../../../app/contexts/Notifications';
import * as PulsarGrpcClient from '../../../app/contexts/PulsarGrpcClient/PulsarGrpcClient';
import * as Modals from '../../../app/contexts/Modals/Modals';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import { DeleteSchemaRequest } from '../../../../grpc-web/tools/teal/pulsar/ui/api/v1/schema_pb';
import ConfirmationDialog from '../../../ui/ConfirmationDialog/ConfirmationDialog';
import { CurrentView } from '../Schema';

export type Props = {
  topic: string,
  refetchData: () => void,
  changeView: (type: CurrentView) => void,
};

const DeleteDialog = (props: Props) => {
  const modals = Modals.useContext();
  const { notifyError, notifySuccess } = Notifications.useContext();
  const { schemaServiceClient } = PulsarGrpcClient.useContext();

  const deleteSchema = async () => {
    const req = new DeleteSchemaRequest();
    req.setTopic(props.topic);
    const res = await schemaServiceClient.deleteSchema(req, {}).catch(err => notifyError(err));

    if (res === undefined) {
      return;
    }

    if (res.getStatus()?.getCode() === Code.OK) {
      notifySuccess('Successfully deleted the topic schema');
    } else {
      notifyError(res.getStatus()?.getMessage());
    }

    await props.refetchData();

    props.changeView({ type: 'create-schema' });
    modals.pop();
  }

  return (
    <ConfirmationDialog
      description={
        <div>
          <div>This action <strong>cannot</strong> be undone.</div>
          <br />
          <div>All schema versions will be permanently deleted.</div>
        </div>
      }
      onConfirm={deleteSchema}
      onCancel={modals.pop}
    />
  );
}

export default DeleteDialog;
