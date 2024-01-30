import React, { useMemo, useState } from 'react';
import s from './SaveLibraryItemButton.module.css';
import * as pb from '../../../../../../grpc-web/tools/teal/pulsar/ui/library/v1/library_pb';
import * as GrpcClient from '../../../../../app/contexts/GrpcClient/GrpcClient';
import * as Modals from '../../../../../app/contexts/Modals/Modals';
import * as Notifications from '../../../../../app/contexts/Notifications';
import { LibraryContext, resourceMatcherFromContext } from '../../../model/library-context';
import { ManagedItem, ManagedItemType } from '../../../model/user-managed-items';
import { getReadableItemType } from '../../../get-readable-item-type';
import { getDefaultManagedItem } from '../../../default-library-items';
import SmallButton from '../../../../SmallButton/SmallButton';
import { Code } from '../../../../../../grpc-web/google/rpc/code_pb';
import CreateItemDialog from '../../../dialogs/CreateItemDialog/CreateItemDialog';
import EditItemDialog from '../../../dialogs/EditItemDialog/EditItemDialog';
import OverrideExistingItemDialog from '../../../dialogs/OverrideExistingItemDialog/OverrideExistingItemDialog';
import { libraryItemFromPb } from '../../../model/library-conversions';

export type CreateLibraryItemButtonProps = {
  item: ManagedItem,
  libraryContext: LibraryContext,
  onSaved: (item: ManagedItem) => void
};

const CreateLibraryItemButton: React.FC<CreateLibraryItemButtonProps> = (props) => {
  const modals = Modals.useContext();
  const { libraryServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();

  return (
    <SmallButton
      type='regular'
      text='Save'
      onClick={async () => {
        const req = new pb.GetLibraryItemRequest();
        req.setId(props.item.metadata.id);

        const res = await libraryServiceClient.getLibraryItem(req, null)
          .catch(err => notifyError(`Unable to get library item. ${err}`));

        if (res === undefined) {
          return;
        }


        if ((res.getStatus()?.getCode() !== Code.OK) && (res.getStatus()?.getCode() !== Code.NOT_FOUND)) {
          notifyError(`Unable to get library item. ${res.getStatus()?.getMessage()}`);
          return;
        }

        const isItemFound = res.getStatus()?.getCode() === Code.OK;

        if (!isItemFound) {
          modals.push({
            id: `create-library-item`,
            title: 'Create Library Item',
            content: (
              <div className={s.Dialog}>
                <CreateItemDialog
                  item={props.item}
                  onCanceled={modals.pop}
                  onCreated={(libraryItem) => {
                    props.onSaved(libraryItem.spec);
                    modals.pop();
                  }}
                  availableForContexts={[resourceMatcherFromContext(props.libraryContext)]}
                  libraryContext={props.libraryContext}
                />
              </div>
            ),
            styleMode: 'no-content-padding'
          });

          return;
        }

        const libraryItem = libraryItemFromPb(res.getItem()!);

        modals.push({
          id: `edit-library-item`,
          title: 'Edit Library Item',
          content: (
            <div className={s.Dialog}>
              <OverrideExistingItemDialog
                libraryItem={libraryItem}
                onCanceled={modals.pop}
                onSaved={(libraryItem) => {
                  props.onSaved(libraryItem.spec);
                  modals.pop();
                }}
                itemIdToOverride={libraryItem.spec.metadata.id}
                libraryContext={props.libraryContext}
              />
            </div>
          ),
          styleMode: 'no-content-padding'
        });
      }}
    />
  );
}

export default CreateLibraryItemButton;
