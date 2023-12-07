import React from 'react';
import * as Modals from '../app/Modals/Modals';
import { apiChannel } from '../../main/channels';
import { DeleteLocalPulsarInstance } from '../../main/api/local-pulsar-instances/types';
import ConfirmationDialog from '../ui/ConfirmationDialog/ConfirmationDialog';
import DeleteButton from '../ui/DeleteButton/DeleteButton';

export type DeleteLocalPulsarInstanceButtonProps = {
  instanceId: string,
  instanceName: string,
  disabled?: boolean
};

const DeleteLocalPulsarInstanceButton: React.FC<DeleteLocalPulsarInstanceButtonProps> = (props) => {
  const modals = Modals.useContext();

  return (
    <DeleteButton
      disabled={props.disabled}
      isHideText
      onClick={() => {
        modals.push({
          id: 'delete-local-pulsar-instance',
          title: 'Delete Local Pulsar Instance',
          content: (
            <ConfirmationDialog
              content={(<>Are you sure that you're going to delete local Pulsar instance <strong>{props.instanceName}</strong> and all it's data?</>)}
              type='danger'
              onCancel={() => {
                modals.pop();
              }}
              onConfirm={() => {
                const req: DeleteLocalPulsarInstance = {
                  type: "DeleteLocalPulsarInstance",
                  instanceId: props.instanceId,
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

export default DeleteLocalPulsarInstanceButton;
