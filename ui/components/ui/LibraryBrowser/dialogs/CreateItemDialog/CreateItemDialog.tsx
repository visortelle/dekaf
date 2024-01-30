import React, { useEffect, useState } from 'react';
import s from './CreateItemDialog.module.css'
import { ManagedItem } from '../../model/user-managed-items';
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
import { ResourceMatcher } from '../../model/resource-matchers';

export type CreateItemDialogProps = {
  item: ManagedItem,
  availableForContexts: ResourceMatcher[],
  libraryContext: LibraryContext,
  onCanceled: () => void,
  onCreated: (libraryItem: LibraryItem) => void
};

const CreateItemDialog: React.FC<CreateItemDialogProps> = (props) => {
  const { libraryServiceClient } = GrpcClient.useContext();
  const { notifySuccess, notifyError } = Notifications.useContext();
  const [newLibraryItem, setNewLibraryItem] = useState<LibraryItem | undefined>(undefined);

  useEffect(() => {
    const newNewLibraryItem: LibraryItem = {
      metadata: {
        availableForContexts: props.availableForContexts,
        updatedAt: new Date().toISOString()
      },
      spec: cloneDeep(props.item)
    };

    setNewLibraryItem(newNewLibraryItem);
  }, [props.item, props.libraryContext]);

  return (
    <div className={s.CreateItemDialog}>
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
            {newLibraryItem !== undefined && (
              <ResourceMatchersInput
                value={newLibraryItem?.metadata.availableForContexts}
                onChange={(v) => {
                  if (newLibraryItem === undefined) {
                    return;
                  }

                  const newNewLibraryItem = cloneDeep(newLibraryItem);
                  newNewLibraryItem.metadata.availableForContexts = v;

                  setNewLibraryItem(newNewLibraryItem);
                }}
                libraryContext={props.libraryContext}
              />
            )}
          </FormItem>
        </div>

        <div className={s.Editor}>
          {newLibraryItem !== undefined && (
            <LibraryItemEditor
              mode={'editor'}
              value={newLibraryItem}
              onChange={setNewLibraryItem}
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
          type='regular'
          text='Edit'
          onClick={() => { }}
        />
        <Button
          type='primary'
          testId='Create'
          disabled={newLibraryItem === undefined}
          onClick={async () => {
            if (newLibraryItem === undefined) {
              return;
            }

            const req = new pb.SaveLibraryItemRequest();
            const itemPb = libraryItemToPb(newLibraryItem);
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
                  <li><strong>Name:</strong> {newLibraryItem.spec.metadata.name}</li>
                  <li><strong>ID:</strong> {newLibraryItem.spec.metadata.id}</li>
                </ul>
              </div>
            );
            props.onCreated(newLibraryItem);
          }}
        />
      </div>
    </div>
  );
}

export default CreateItemDialog;
