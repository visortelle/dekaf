import React, { useEffect, useState } from 'react';
import s from './OverrideExistingItemDialog.module.css';
import LibraryItemEditor from '../../LibraryItemEditor/LibraryItemEditor';
import { LibraryItem } from '../../model/library';
import { LibraryContext, resourceMatcherFromContext } from '../../model/library-context';
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
import { cloneDeep } from 'lodash';

export type OverrideExistingItemDialogProps = {
  libraryItem: LibraryItem,
  libraryContext: LibraryContext,
  onCanceled: () => void,
  onSaved: (libraryItem: LibraryItem) => void,
  itemIdToOverride?: string
};

const OverrideExistingItemDialog: React.FC<OverrideExistingItemDialogProps> = (props) => {
  const { libraryServiceClient } = GrpcClient.useContext();
  const { notifySuccess, notifyError } = Notifications.useContext();
  const [selectedItem, setSelectedItem] = useState<LibraryItem | undefined>(undefined);
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(props.libraryItem.spec.metadata.id);
  const [searchResults, setSearchResults] = useState<LibraryItem[]>([]);
  const [searchResultsRefreshKey, setSearchResultsRefreshKey] = useState(0);
  const [searchInContexts, setSearchInContexts] = useState<ResourceMatcher[]>(props.libraryItem.metadata.availableForContexts);

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

  const overrideItem = async () => {
    if (selectedItem === undefined) {
      return;
    }

    const itemToSave = cloneDeep(props.libraryItem);
    itemToSave.spec.metadata.id = selectedItem.spec.metadata.id;

    const req = new pb.SaveLibraryItemRequest();
    const itemPb = libraryItemToPb(itemToSave);
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
          <li><strong>Name:</strong> {itemToSave.spec.metadata.name}</li>
          <li><strong>ID:</strong> {itemToSave.spec.metadata.id}</li>
        </ul>
      </div>
    );
    props.onSaved(itemToSave);
  }

  return (
    <div className={s.OverrideExistingItemDialog}>
      <div className={s.Content}>
        <div className={s.SearchInContexts}>
          <FormItem>
            <FormLabel
              content={<H3>Search in contexts</H3>}
            />
            <ResourceMatchersInput
              value={searchInContexts}
              onChange={setSearchInContexts}
              libraryContext={props.libraryContext}
            />
          </FormItem>
        </div>

        <div className={s.SearchResults}>
          <SearchResults
            key={searchResultsRefreshKey}
            itemType={props.libraryItem.spec.metadata.type}
            resourceMatchers={searchInContexts}
            items={searchResults}
            onItems={setSearchResults}
            onDeleted={(deletedItemId) => {
              if (selectedItemId === deletedItemId) {
                setSelectedItemId(undefined);
              }

              // TODO
              setSearchResultsRefreshKey(v => v + 1);
            }}
            onItemClick={() => { }}
            onItemDoubleClick={overrideItem}
            selectedItemId={selectedItemId}
            onSelected={setSelectedItemId}
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

      <div className={s.Footer}>
        <Button
          type='regular'
          text='Cancel'
          onClick={props.onCanceled}
        />
        <Button
          type='regular'
          text='Save as new item'
          onClick={() => { }}
        />
        <Button
          type='primary'
          text='Override'
          disabled={selectedItem === undefined}
          onClick={overrideItem}
        />
      </div>
    </div>
  );
}

export default OverrideExistingItemDialog;

