import React, { useEffect, useState } from 'react';
import s from './OverwriteExistingItemDialog.module.css';
import * as Modals from '../../../../app/contexts/Modals/Modals';
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
import { cloneDeep } from 'lodash';
import NothingToShow from '../../../NothingToShow/NothingToShow';
import EditNameDialog from '../../../RenameButton/EditNameDialog/EditNameDialog';

export type OverwriteExistingItemDialogProps = {
  libraryItem: LibraryItem,
  libraryContext: LibraryContext,
  onCanceled: () => void,
  onSaved: (libraryItem: LibraryItem) => void,
  itemIdToOverwrite?: string
};

const OverwriteExistingItemDialog: React.FC<OverwriteExistingItemDialogProps> = (props) => {
  const modals = Modals.useContext();
  const { libraryServiceClient } = GrpcClient.useContext();
  const { notifySuccess, notifyError } = Notifications.useContext();
  const [libraryItem, setLibraryItem] = useState(props.libraryItem);
  const [selectedItem, setSelectedItem] = useState<LibraryItem | undefined>(undefined);
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(libraryItem.spec.metadata.id);
  const [searchResults, setSearchResults] = useState<LibraryItem[]>([]);
  const [searchResultsRefreshKey, setSearchResultsRefreshKey] = useState(0);
  const [searchInContexts, setSearchInContexts] = useState<ResourceMatcher[]>(libraryItem.metadata.availableForContexts);
  const [saveItemRequested, setSaveItemRequested] = useState(false);

  useEffect(() => {
    async function fetchSelectedLibraryItem() {
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

    fetchSelectedLibraryItem();
  }, [selectedItemId]);

  useEffect(() => {
    async function doSave() {
      await saveItem();
      setSaveItemRequested(false);
    }

    if (saveItemRequested) {
      doSave();
    }
  }, [saveItemRequested, libraryItem]);

  const setNameAndSaveLibraryName = () => {
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

  const saveItem = async () => {
    if (selectedItem === undefined) {
      return;
    }

    if (!libraryItem?.spec.metadata.name) {
      setNameAndSaveLibraryName();
      return;
    }

    const itemToSave = cloneDeep(libraryItem);
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
    <div className={s.OverwriteExistingItemDialog}>
      <div className={s.Content}>
        <div className={s.SearchInContexts}>
          <FormItem>
            <FormLabel
              content={<H3>Search in Contexts</H3>}
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
            itemType={libraryItem.spec.metadata.type}
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
            onItemDoubleClick={saveItem}
            selectedItemId={selectedItemId}
            onSelected={setSelectedItemId}
            libraryContext={props.libraryContext}
            onEdited={() => setSearchResultsRefreshKey(v => v + 1)}
            isReadOnly={true}
          />
        </div>

        <div className={s.Editor}>
          {selectedItem === undefined && (
            <div style={{ display: 'grid', padding: '12rem', flex: '1' }}>
              <NothingToShow content="No library item selected" />
            </div>
          )}
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
          type='primary'
          text='Overwrite'
          disabled={selectedItem === undefined}
          onClick={saveItem}
        />
      </div>
    </div>
  );
}

export default OverwriteExistingItemDialog;
