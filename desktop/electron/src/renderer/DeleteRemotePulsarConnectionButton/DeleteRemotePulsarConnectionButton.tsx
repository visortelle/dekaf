import React from 'react';
import * as Modals from '../app/Modals/Modals';
import { apiChannel } from '../../main/channels';
import { DeleteLocalPulsarInstance } from '../../main/api/local-pulsar-instances/types';
import ConfirmationDialog from '../ui/ConfirmationDialog/ConfirmationDialog';
import DeleteButton from '../ui/DeleteButton/DeleteButton';
import { DeleteRemotePulsarConnection } from '../../main/api/remote-pulsar-connections/types';

export type DeleteRemotePulsarConnectionButtonProps = {
  connectionId: string,
  connectionName: string,
  disabled?: boolean
};

const DeleteRemotePulsarConnectionButton: React.FC<DeleteRemotePulsarConnectionButtonProps> = (props) => {
  const modals = Modals.useContext();

  return (
    <DeleteButton
      disabled={props.disabled}
      isHideText
      onClick={() => {
        modals.push({
          id: 'edit-modal-pulsar-instance',
          title: 'Delete Remote Pulsar Connection',
          content: (
            <ConfirmationDialog
              content={(<>Are you sure that you're going to delete remote Pulsar connection <strong>{props.connectionName}</strong>?</>)}
              type='danger'
              onCancel={() => {
                modals.pop();
              }}
              onConfirm={() => {
                const req: DeleteRemotePulsarConnection = {
                  type: "DeleteRemotePulsarConnection",
                  connectionId: props.connectionId,
                }
                window.electron.ipcRenderer.sendMessage(apiChannel, req);

                modals.pop();
              }}
            />
          ),
          styleMode: 'no-content-padding'
        });
      }}
    />
  );
}

export default DeleteRemotePulsarConnectionButton;
