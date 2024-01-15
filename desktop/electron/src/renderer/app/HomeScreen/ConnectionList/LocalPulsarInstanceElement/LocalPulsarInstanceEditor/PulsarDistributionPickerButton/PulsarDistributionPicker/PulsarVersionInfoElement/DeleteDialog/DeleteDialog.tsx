import React from 'react';
import * as Modals from '../../../../../../../../Modals/Modals';
import ConfirmationDialog from '../../../../../../../../../ui/ConfirmationDialog/ConfirmationDialog';
import { DeletePulsarDistribution } from '../../../../../../../../../../main/api/local-pulsar-distributions/types';
import { apiChannel } from '../../../../../../../../../../main/channels';

export type DeleteDialogProps = {
  version: string
};

const DeleteDialog: React.FC<DeleteDialogProps> = (props) => {
  const modals = Modals.useContext();

  const deletePulsarDistribution = async () => {
    const req: DeletePulsarDistribution = {
      type: "DeletePulsarDistribution",
      version: props.version
    }

    window.electron.ipcRenderer.sendMessage(apiChannel, req);
    modals.pop();
  };

  return (
    <ConfirmationDialog
      content={<span>Are you sure that you want to delete Pulsar <strong>{props.version}</strong> distribution?</span>}
      onConfirm={deletePulsarDistribution}
      onCancel={modals.pop}
      type='danger'
    />
  );
}

export default DeleteDialog;
