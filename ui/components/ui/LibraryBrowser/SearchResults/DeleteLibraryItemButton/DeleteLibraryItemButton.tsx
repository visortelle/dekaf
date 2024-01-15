import React from 'react';
import s from './DeleteLibraryItemButton.module.css'
import * as pb from "../../../../../grpc-web/tools/teal/pulsar/ui/library/v1/library_pb";
import * as GrpcClient from '../../../../app/contexts/GrpcClient/GrpcClient';
import * as Notifications from '../../../../app/contexts/Notifications';
import * as Modals from '../../../../app/contexts/Modals/Modals';
import { Code } from '../../../../../grpc-web/google/rpc/code_pb';
import ConfirmationButton from '../../../ConfirmationButton/ConfirmationButton';
import deleteIcon from './delete.svg';

export type DeleteLibraryItemButtonProps = {
  itemId: string | undefined;
  onDeleted: () => void;
  isDisabled?: boolean;
};

const DeleteLibraryItemButton: React.FC<DeleteLibraryItemButtonProps> = (props) => {
  const { libraryServiceClient } = GrpcClient.useContext();
  const { notifyError, notifySuccess } = Notifications.useContext();
  const modals = Modals.useContext();

  return (
    <ConfirmationButton
      button={{
        type: 'regular',
        title: 'Delete this item',
        svgIcon: deleteIcon,
        appearance: 'borderless-semitransparent'
      }}
      modal={{
        title: 'Delete Library Item',
        id: 'delete-library-item'
      }}
      dialog={{
        type: 'danger',
        content: <p>Are you sure you want to delete this library item?</p>,
        onConfirm: async () => {
          if (props.itemId === undefined) {
            return;
          }

          const req = new pb.DeleteLibraryItemRequest();
          req.setId(props.itemId);

          const res = await libraryServiceClient.deleteLibraryItem(req, null)
            .catch(err => notifyError(`Unable to delete library item. ${err}`));

          if (res === undefined) {
            return;
          }

          if (res.getStatus()?.getCode() !== Code.OK) {
            notifyError(`Unable to delete library item. ${res.getStatus()?.getMessage()}`);
            return;
          }

          notifySuccess('Library item has been successfully deleted.');
          props.onDeleted();
          modals.pop();
        }
      }}
    />
  );
}

export default DeleteLibraryItemButton;
