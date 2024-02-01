import React from 'react';
import s from './SaveLibraryItemButton.module.css';
import * as pb from '../../../../../../grpc-web/tools/teal/pulsar/ui/library/v1/library_pb';
import * as GrpcClient from '../../../../../app/contexts/GrpcClient/GrpcClient';
import * as Modals from '../../../../../app/contexts/Modals/Modals';
import * as Notifications from '../../../../../app/contexts/Notifications';
import { LibraryContext, resourceMatcherFromContext } from '../../../model/library-context';
import { ManagedItem } from '../../../model/user-managed-items';
import SmallButton from '../../../../SmallButton/SmallButton';
import { Code } from '../../../../../../grpc-web/google/rpc/code_pb';
import SaveItemDialog from '../../../dialogs/SaveItemDialog/SaveItemDialog';
import { libraryItemFromPb } from '../../../model/library-conversions';
import { LibraryItem } from '../../../model/library';
import { cloneDeep } from 'lodash';
import saveIcon from './save.svg';

export type SaveLibraryItemButtonProps = {
  item: ManagedItem,
  libraryContext: LibraryContext,
  onSaved: (item: ManagedItem) => void
};

const SaveLibraryItemButton: React.FC<SaveLibraryItemButtonProps> = (props) => {
  const modals = Modals.useContext();
  const { libraryServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();

  return (
    <SmallButton
      type='regular'
      svgIcon={saveIcon}
      appearance='borderless-semitransparent'
      title="Save library item"
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

        const isExistingItem = res.getStatus()?.getCode() === Code.OK;

        let libraryItem: LibraryItem;
        switch (isExistingItem) {
          case true: {
            libraryItem = libraryItemFromPb(res.getItem()!);
            libraryItem.spec = props.item;
            break;
          }
          case false: {
            libraryItem = {
              metadata: {
                availableForContexts: [resourceMatcherFromContext(props.libraryContext)],
                updatedAt: new Date().toISOString()
              },
              spec: cloneDeep(props.item)
            };
            break;
          }
        }

        modals.push({
          id: `save-library-item`,
          title: 'Save Library Item',
          content: (
            <SaveItemDialog
              libraryItem={libraryItem}
              isExistingItem={isExistingItem}
              onCanceled={modals.pop}
              onSaved={(libraryItem) => {
                props.onSaved(libraryItem.spec);
                modals.pop();
              }}
              libraryContext={props.libraryContext}
            />
          ),
          styleMode: 'no-content-padding'
        });
      }}
    />
  );
}

export default SaveLibraryItemButton;
