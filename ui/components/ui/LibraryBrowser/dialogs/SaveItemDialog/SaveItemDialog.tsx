import React, { useEffect, useState } from 'react';
import s from './SaveItemDialog.module.css'
import LibraryItemEditor from '../../LibraryItemEditor/LibraryItemEditor';
import { LibraryItem } from '../../model/library';
import { LibraryContext } from '../../model/library-context';
import { cloneDeep } from 'lodash';
import Button from '../../../Button/Button';
import * as pb from '../../../../../grpc-web/tools/teal/pulsar/ui/library/v1/library_pb';
import { libraryItemToPb } from '../../model/library-conversions';
import * as GrpcClient from '../../../../app/contexts/GrpcClient/GrpcClient';
import * as Notifications from '../../../../app/contexts/Notifications';
import * as Modals from '../../../../app/contexts/Modals/Modals';
import { Code } from '../../../../../grpc-web/google/rpc/code_pb';
import FormItem from '../../../ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../../ConfigurationTable/FormLabel/FormLabel';
import { H3 } from '../../../H/H';
import ResourceMatchersInput from '../../SearchEditor/ResourceMatchersInput/ResourceMatchersInput';
import EditNameDialog from '../../../RenameButton/EditNameDialog/EditNameDialog';
import OverwriteExistingItemDialog from '../OverwriteExistingItemDialog/OverwriteExistingItemDialog';
import { v4 as uuid } from 'uuid';

export type SaveItemDialogProps = {
  libraryItem: LibraryItem,
  isExistingItem: boolean,
  libraryContext: LibraryContext,
  onCanceled: () => void,
  onSaved: (libraryItem: LibraryItem) => void
};

const SaveItemDialog: React.FC<SaveItemDialogProps> = (props) => {
  const { libraryServiceClient } = GrpcClient.useContext();
  const modals = Modals.useContext();
  const { notifySuccess, notifyError } = Notifications.useContext();
  const [libraryItem, setLibraryItem] = useState<LibraryItem | undefined>(props.libraryItem);
  const [saveItemRequested, setSaveItemRequested] = useState(false);

  const saveItem = async () => {
    if (libraryItem === undefined) {
      return;
    }

    if (!libraryItem?.spec.metadata.name) {
      setNameAndSaveLibraryItem(libraryItem);
      return;
    }

    const req = new pb.SaveLibraryItemRequest();
    const itemPb = libraryItemToPb(libraryItem);
    req.setItem(itemPb);

    const res = await libraryServiceClient.saveLibraryItem(req, null).catch(err => {
      notifyError(`Unable to save library item. ${err}`);
    });

    if (res === undefined) {
      return;
    }

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to save library item. ${res.getStatus()?.getMessage()}`);
      return;
    }

    notifySuccess(
      <div>
        Library item successfully created.

        <ul>
          <li><strong>Name:</strong> {libraryItem.spec.metadata.name}</li>
          <li><strong>ID:</strong> {libraryItem.spec.metadata.id}</li>
        </ul>
      </div>
    );
    props.onSaved(libraryItem);
  }

  useEffect(() => {
    async function doSave() {
      await saveItem();
      setSaveItemRequested(false);
    }

    if (saveItemRequested) {
      doSave();
    }
  }, [saveItemRequested, libraryItem]);

  const setNameAndSaveLibraryItem = (libraryItem: LibraryItem) => {
    modals.push({
      id: 'set-library-item-name',
      title: `Set Library Item Name`,
      content: (
        <EditNameDialog
          initialValue={libraryItem?.spec.metadata.name || ''}
          onCancel={modals.pop}
          onConfirm={(v) => {
            if (libraryItem === undefined) {
              return;
            }

            const newLibraryItem = cloneDeep(libraryItem);
            newLibraryItem.spec.metadata.name = v;

            setLibraryItem(newLibraryItem);
            setSaveItemRequested(true);
            modals.pop();
          }}
        />
      ),
      styleMode: 'no-content-padding'
    });
  }

  return (
    <div className={s.SaveItemDialog}>
      <div className={s.Content}>
        <div className={s.AvailableForContexts}>
          <FormItem>
            <FormLabel
              content={<H3>Available in Contexts</H3>}
              help={
                <>
                  Pulsar resources this item is available for.
                </>
              }
            />
            {libraryItem !== undefined && (
              <ResourceMatchersInput
                value={libraryItem?.metadata.availableForContexts}
                onChange={(v) => {
                  if (libraryItem === undefined) {
                    return;
                  }

                  const newLibraryItem = cloneDeep(libraryItem);
                  newLibraryItem.metadata.availableForContexts = v;

                  setLibraryItem(newLibraryItem);
                }}
                libraryContext={props.libraryContext}
              />
            )}
          </FormItem>
        </div>

        <div className={s.Editor}>
          {libraryItem !== undefined && (
            <LibraryItemEditor
              mode={'editor'}
              value={libraryItem}
              onChange={setLibraryItem}
              libraryContext={props.libraryContext}
              libraryBrowserPanel={{ hiddenElements: ["save-button"] }}
            />
          )}
        </div>
      </div>

      <div className={s.Footer}>
        <Button
          type='regular'
          text='Cancel'
          onClick={props.onCanceled}
        />
        <Button
          type='regular'
          text='Overwrite Another'
          onClick={() => {
            if (libraryItem === undefined) {
              return;
            }

            modals.push({
              id: `edit-library-item`,
              title: 'Overwrite Library Item',
              content: (
                <OverwriteExistingItemDialog
                  libraryItem={libraryItem}
                  onCanceled={modals.pop}
                  onSaved={(libraryItem) => {
                    props.onSaved(libraryItem);
                    modals.pop();
                  }}
                  itemIdToOverwrite={props.isExistingItem ? libraryItem.spec.metadata.id : undefined}
                  libraryContext={props.libraryContext}
                />
              ),
              styleMode: 'no-content-padding'
            });
          }}
        />
        {props.isExistingItem && (
          <Button
            type='regular'
            text='Save as New'
            disabled={libraryItem === undefined}
            onClick={() => {
              if (libraryItem === undefined) {
                return;
              }

              const newLibraryItem = cloneDeep(libraryItem);
              newLibraryItem.spec.metadata.id = uuid();
              setLibraryItem(newLibraryItem);

              setNameAndSaveLibraryItem(newLibraryItem);
            }}
          />
        )}
        <Button
          type='primary'
          text={props.isExistingItem ? 'Save' : 'Create'}
          disabled={libraryItem === undefined}
          onClick={saveItem}
        />
      </div>
    </div>
  );
}

export default SaveItemDialog;
