import React, { useEffect, useState } from 'react';
import s from './CreateItemDialog.module.css'
import LibraryItemEditor from '../../LibraryItemEditor/LibraryItemEditor';
import { LibraryItem } from '../../model/library';
import { LibraryContext } from '../../model/library-context';
import Button from '../../../Button/Button';
import * as pb from '../../../../../grpc-web/tools/teal/pulsar/ui/library/v1/library_pb';
import { libraryItemFromPb, libraryItemToPb } from '../../model/library-conversions';
import * as GrpcClient from '../../../../app/contexts/GrpcClient/GrpcClient';
import * as Notifications from '../../../../app/contexts/Notifications';
import { Code } from '../../../../../grpc-web/google/rpc/code_pb';
import FormItem from '../../../ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../../ConfigurationTable/FormLabel/FormLabel';
import { H3 } from '../../../H/H';
import ResourceMatchersInput from '../../SearchEditor/ResourceMatchersInput/ResourceMatchersInput';
import SearchResults from '../../SearchResults/SearchResults';
import { ResourceMatcher } from '../../model/resource-matchers';

export type OverrideExistingItemDialogProps = {
  libraryItem: LibraryItem,
  libraryContext: LibraryContext,
  onCanceled: () => void,
  onSaved: (libraryItem: LibraryItem) => void
};

const OverrideExistingItemDialog: React.FC<OverrideExistingItemDialogProps> = (props) => {
  const { libraryServiceClient } = GrpcClient.useContext();
  const { notifySuccess, notifyError } = Notifications.useContext();
  const [selectedItem, setSelectedItem] = useState<LibraryItem | undefined>(undefined);
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(undefined);
  const [searchResults, setSearchResults] = useState<LibraryItem[]>([]);
  const [searchInContexts, setSearchInContexts] = useState<ResourceMatcher[]>([]);

  useEffect(() => {
    async function fetchLibraryItem() {
      if (selectedItemId === undefined) {
        return;
      }

      const req = new pb.GetLibraryItemRequest();
      req.setId(selectedItemId);

      const res = await libraryServiceClient.getLibraryItem(req, null)
        .catch(err => notifyError(`Unable to fetch library item ${selectedItemId}. ${err}`));

      if (res === undefined) {
        return;
      }

      const resCode = res.getStatus()?.getCode();
      if (!((resCode === Code.OK) || (resCode === Code.NOT_FOUND))) {
        notifyError(`Unable to fetch library item ${selectedItemId}. ${res.getStatus()?.getMessage()}`);
        return;
      }

      if (resCode === Code.NOT_FOUND) {
        notifyError(`Unable to find the item with id: ${selectedItemId}`);
        return;
      }

      if (resCode === Code.OK) {
        setSelectedItem(libraryItemFromPb(res.getItem()!));
        return;
      }
    }

    fetchLibraryItem();
  }, [selectedItemId]);

  const overrideItem = async (itemId: string) => {

  }

  return (
    <div className={s.OverrideExistingItemDialog}>
      <div>
        <div className={s.SearchInContexts}>
          <FormItem>
            <FormLabel
              content={<H3>Search in contexts</H3>}
            />
            {selectedItem !== undefined && (
              <ResourceMatchersInput
                value={searchInContexts}
                onChange={setSearchInContexts}
                libraryContext={props.libraryContext}
                isReadOnly={true}
              />
            )}
          </FormItem>
        </div>

        <div className={s.SearchResults}>
          <SearchResults
            itemType={props.libraryItem.spec.metadata.type}
            resourceMatchers={searchInContexts}
            items={searchResults}
            onItems={setSearchResults}
            onDeleted={() => { }}
            onItemClick={setSelectedItemId}
            onItemDoubleClick={overrideItem}
          />
        </div>

        <div className={s.Editor}>
          {selectedItem !== undefined && (
            <LibraryItemEditor
              mode={'viewer'}
              value={selectedItem}
              onChange={() => { }}
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
          text='Save as new'
          onClick={() => { }}
        />
        <Button
          type='primary'
          testId='Override'
          disabled={selectedItem === undefined}
          onClick={async () => {
            if (selectedItem === undefined) {
              return;
            }

            const req = new pb.SaveLibraryItemRequest();
            const itemPb = libraryItemToPb(selectedItem);
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
                  <li><strong>Name:</strong> {selectedItem.spec.metadata.name}</li>
                  <li><strong>ID:</strong> {selectedItem.spec.metadata.id}</li>
                </ul>
              </div>
            );
            props.onSaved(selectedItem);
          }}
        />
      </div>
    </div>
  );
}

export default OverrideExistingItemDialog;

