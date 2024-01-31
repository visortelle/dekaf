import React, { useEffect, useState } from 'react';
import s from './EditItemDialog.module.css'
import LibraryItemEditor from '../../LibraryItemEditor/LibraryItemEditor';
import { LibraryItem } from '../../model/library';
import { LibraryContext } from '../../model/library-context';
import { cloneDeep } from 'lodash';
import Button from '../../../Button/Button';
import * as pb from '../../../../../grpc-web/tools/teal/pulsar/ui/library/v1/library_pb';
import { libraryItemToPb } from '../../model/library-conversions';
import * as GrpcClient from '../../../../app/contexts/GrpcClient/GrpcClient';
import * as Notifications from '../../../../app/contexts/Notifications';
import { Code } from '../../../../../grpc-web/google/rpc/code_pb';
import FormItem from '../../../ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../../ConfigurationTable/FormLabel/FormLabel';
import { H3 } from '../../../H/H';
import ResourceMatchersInput from '../../SearchEditor/ResourceMatchersInput/ResourceMatchersInput';

export type EditItemDialogProps = {
  libraryItem: LibraryItem,
  libraryContext: LibraryContext,
  onCanceled: () => void,
  onSaved: (libraryItem: LibraryItem) => void
};

const EditItemDialog: React.FC<EditItemDialogProps> = (props) => {
  const { libraryServiceClient } = GrpcClient.useContext();
  const { notifySuccess, notifyError } = Notifications.useContext();
  const [libraryItem, setLibraryItem] = useState<LibraryItem | undefined>(props.libraryItem);

  return (
    <div className={s.EditItemDialog}>
      <div>
        <div className={s.AvailableForContexts}>
          <FormItem>
            <FormLabel
              content={<H3>Available in contexts</H3>}
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

                  const newNewLibraryItem = cloneDeep(libraryItem);
                  newNewLibraryItem.metadata.availableForContexts = v;

                  setLibraryItem(newNewLibraryItem);
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

      <div>
        <Button
          type='regular'
          text='Cancel'
          onClick={props.onCanceled}
        />
        <Button
          type='primary'
          testId='Save'
          disabled={libraryItem === undefined}
          onClick={async () => {
            if (libraryItem === undefined) {
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
                Library item successfully updated.

                <ul>
                  <li><strong>Name:</strong> {libraryItem.spec.metadata.name}</li>
                  <li><strong>ID:</strong> {libraryItem.spec.metadata.id}</li>
                </ul>
              </div>
            );
            props.onSaved(libraryItem);
          }}
        />
      </div>
    </div>
  );
}

export default EditItemDialog;
