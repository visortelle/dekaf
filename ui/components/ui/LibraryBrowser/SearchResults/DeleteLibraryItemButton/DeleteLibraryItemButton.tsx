import React from 'react';
import s from './DeleteLibraryItemButton.module.css'
import SmallButton from '../../../SmallButton/SmallButton';
import * as pb from "../../../../../grpc-web/tools/teal/pulsar/ui/library/v1/library_pb";
import * as GrpcClient from '../../../../app/contexts/GrpcClient/GrpcClient';
import * as Notifications from '../../../../app/contexts/Notifications';
import * as Modals from '../../../../app/contexts/Modals/Modals';
import ConfirmationDialog from '../../../ConfirmationDialog/ConfirmationDialog';
import { Code } from '../../../../../grpc-web/google/rpc/code_pb';
import DeleteButton from '../../../DeleteButton/DeleteButton';

export type DeleteLibraryItemButtonProps = {
  itemId: string | undefined;
  onDeleted: () => void;
  isDisabled?: boolean;
};

const DeleteLibraryItemButton: React.FC<DeleteLibraryItemButtonProps> = (props) => {
  const { libraryServiceClient } = GrpcClient.useContext();
  const { notifyError, notifySuccess } = Notifications.useContext();
  const modals = Modals.useContext();

  const deleteItem = async () => {
    modals.push({
      id: 'delete-library-item',
      content: (
        <ConfirmationDialog
          content={<p>Are you sure you want to delete this library item?</p>}
          onCancel={modals.pop}
          onConfirm={async () => {
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
          }}
          type='danger'
        />
      ),
      title: 'Delete Library Item',
      styleMode: 'no-content-padding'
    });
  };

  return (
    <div className={s.DeleteLibraryItemButton}>
      <DeleteButton
        onClick={() => {
          if (props.itemId === undefined) {
            return;
          }

          deleteItem();
        }}
        type='regular'
        title="Delete this item"
        isHideText
        appearance='borderless-semitransparent'
      />
    </div>
  );
}

export default DeleteLibraryItemButton;
