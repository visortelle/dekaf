import React, { useEffect, useRef, useState } from 'react';
import s from './LibraryBrowser.module.css'
import { LibraryItem, LibraryItemMetadata } from './model/library';
import SearchEditor, { SearchEditorValue } from './SearchEditor/SearchEditor';
import SearchResults from './SearchResults/SearchResults';
import LibraryItemEditor from './LibraryItemEditor/LibraryItemEditor';
import Button from '../Button/Button';
import * as pb from "../../../grpc-web/tools/teal/pulsar/ui/library/v1/library_pb";
import * as GrpcClient from '../../app/contexts/GrpcClient/GrpcClient';
import * as Notifications from '../../app/contexts/Notifications';
import * as Modals from '../../app/contexts/Modals/Modals';
import ConfirmationDialog from '../ConfirmationDialog/ConfirmationDialog';
import { ManagedItem, ManagedItemMetadata, ManagedItemType } from './model/user-managed-items';
import NothingToShow from '../NothingToShow/NothingToShow';
import { libraryItemFromPb, libraryItemToPb } from './model/library-conversions';
import { useLibraryItem } from './useLibraryItem';
import { LibraryContext, resourceMatcherFromContext } from './model/library-context';
import { Code } from '../../../grpc-web/google/rpc/code_pb';
import { pulsarResourceToFqn } from '../../pulsar/pulsar-resources';
import { managedItemTypeToPb } from './model/user-managed-items-conversions-pb';
import { getReadableItemType } from './get-readable-item-type';
import { resourceMatcherToPb } from './model/resource-matchers-conversions-pb';

export type LibraryBrowserMode = {
  type: 'save';
  item: ManagedItem;
  onSave: (item: ManagedItem) => void;
} | {
  type: 'pick';
  itemType: ManagedItemType;
  onPick: (item: ManagedItem) => void;
};

export type LibraryBrowserProps = {
  mode: LibraryBrowserMode;
  onCancel: () => void;
  libraryContext: LibraryContext;
};

type SearchResultsState = {
  type: 'pending'
} | {
  type: 'success';
  items: LibraryItem[];
} | {
  type: 'error';
  error: string;
};

export const newItemLabel = 'New item';

const LibraryBrowser: React.FC<LibraryBrowserProps> = (props) => {
  const itemType = props.mode.type === 'save' ? props.mode.item.metadata.type : props.mode.itemType;

  const [searchEditorValue, setSearchEditorValue] = useState<SearchEditorValue>({
    itemType,
    tags: [],
    resourceMatchers: [resourceMatcherFromContext(props.libraryContext)],
  });
  const [searchResults, setSearchResults] = useState<SearchResultsState>({ type: 'pending' });
  const resolvedItemToSaveResult = useLibraryItem(props.mode.type === 'save' ? props.mode.item.metadata.id : undefined);
  const [resolvedItemToSave, setResolvedItemToSave] = useState<LibraryItem | undefined>(undefined);
  const [itemToSave, setItemToSave] = useState<LibraryItem | undefined>(undefined);
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(undefined);
  const { notifyError, notifySuccess } = Notifications.useContext();
  const { libraryServiceClient } = GrpcClient.useContext();
  const modals = Modals.useContext();

  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.scrollTo({ top: 0 });
    }
  }, [selectedItemId]);

  useEffect(() => {
    if (props.mode.type !== 'save') {
      return;
    }

    if (resolvedItemToSaveResult.type === 'success') {
      setResolvedItemToSave(resolvedItemToSaveResult.value);
    }

    if (resolvedItemToSaveResult.type === 'not-found' && itemToSave === undefined) {
      const newResolveItemToSave: LibraryItem = {
        spec: props.mode.item,
        metadata: {
          availableForContexts: searchEditorValue.resourceMatchers,
          tags: [],
          updatedAt: new Date().toISOString()
        }
      };
      newResolveItemToSave.spec.metadata.name = `New ${getReadableItemType(props.mode.item.metadata.type)}`;

      setResolvedItemToSave(newResolveItemToSave);
    }

  }, [resolvedItemToSaveResult, searchEditorValue]);

  useEffect(() => {
    function updateItemToSave() {
      if (props.mode.type !== 'save') {
        return;
      }

      let itemToSave: LibraryItem | undefined = undefined;

      if (resolvedItemToSaveResult.type === 'not-found' && props.mode.type === 'save') {
        const itemToSaveMetadata = {
          availableForContexts: [resourceMatcherFromContext(props.libraryContext)],
          tags: [],
          updatedAt: new Date().toISOString()
        };

        itemToSave = {
          metadata: itemToSaveMetadata,
          spec: props.mode.item
        };
      }

      if (resolvedItemToSaveResult.type === 'success') {
        const itemToSaveMetadata = {
          ...resolvedItemToSaveResult.value.metadata,
          updatedAt: new Date().toISOString()
        };

        itemToSave = {
          metadata: itemToSaveMetadata,
          spec: props.mode.item
        };
      }

      if (itemToSave === undefined) {
        return;
      }

      setItemToSave(itemToSave);
      setSelectedItemId(itemToSave.spec.metadata.id);
      setSearchEditorValue((v) => ({ ...v, resourceMatcher: resourceMatcherFromContext(props.libraryContext) }));
    }

    updateItemToSave();
  }, [resolvedItemToSaveResult, props.mode]);

  async function fetchSearchResults() {
    const req = new pb.ListLibraryItemsRequest();

    const contextsList = searchEditorValue.resourceMatchers.map(rm => resourceMatcherToPb(rm))
    req.setContextsList(contextsList);

    req.setTypesList([managedItemTypeToPb(searchEditorValue.itemType)]);
    req.setTagsList(searchEditorValue.tags);

    const res = await libraryServiceClient.listLibraryItems(req, null)
      .catch(err => {
        setSearchResults({ type: 'error', error: err });
        notifyError(`Unable to fetch library items. ${err}`);
      });

    if (res === undefined) {
      return;
    }

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to fetch library items. ${res.getStatus()?.getMessage()}`);
      setSearchResults({ type: 'error', error: res.getStatus()?.getMessage() ?? 'Unknown error' });
      return;
    }

    const items = res.getItemsList().map(libraryItemFromPb);
    console.log('ITEMS', items);
    setSearchResults({ type: 'success', items });
  }

  useEffect(() => {
    fetchSearchResults();
  }, [searchEditorValue, props.libraryContext]);

  const saveLibraryItem = async (item: LibraryItem) => {
    const req = new pb.SaveLibraryItemRequest();
    const itemPb = libraryItemToPb(item);
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

    if (props.mode.type === 'save') {
      notifySuccess(
        <div>
          Library item successfully saved.

          <ul>
            <li><strong>Name:</strong> {item.spec.metadata.name}</li>
            <li><strong>ID:</strong> {item.spec.metadata.id}</li>
          </ul>
        </div>
      );
      props.mode.onSave(item.spec);
    }
  };

  const items = (itemToSave === undefined ? [] : [itemToSave])
    .concat(searchResults.type === 'success' ?
      searchResults.items.filter(it => it.spec.metadata.id !== itemToSave?.spec.metadata.id) : []
    );

  const selectedItem = items.find((item) => item.spec.metadata.id === selectedItemId);

  let isOverwriteExistingItem = false;
  if (props.mode.type === 'save' && (props.mode.item.metadata.id !== selectedItem?.spec.metadata.id)) {
    isOverwriteExistingItem = true;
  }

  const modeType = props.mode.type;

  const itemToSaveMetadata: ManagedItemMetadata | undefined = (resolvedItemToSave && selectedItem) && {
    ...resolvedItemToSave.spec.metadata,
    id: selectedItem.spec.metadata.id,
    name: selectedItem.spec.metadata.name,
  };

  console.log('resolved item', resolvedItemToSave);
  console.log('item meta', itemToSaveMetadata);

  return (
    <div className={s.LibraryBrowser}>
      <div className={s.Content}>
        <div className={s.SearchEditor}>
          <SearchEditor
            mode={props.mode.type === 'save' ? {
              type: 'edit',
              onChange: setSearchEditorValue,
              value: searchEditorValue
            } : {
              type: "search",
              onChange: setSearchEditorValue,
              value: searchEditorValue
            }}
            libraryContext={props.libraryContext}
          />
        </div>

        <div className={s.SearchResults}>
          {searchResults.type === 'pending' && (
            <div className={s.SearchResultsNothingToShow}>
              <NothingToShow reason='loading-in-progress' />
            </div>
          )}
          {searchResults.type === 'error' && (
            <div className={s.SearchResultsNothingToShow}>
              <NothingToShow reason='error' content={<div><p>Unable to load search results.</p><p>{searchResults.error}</p></div>} />)
            </div>
          )}
          {searchResults.type === 'success' && (
            <SearchResults
              items={items}
              selectedItemId={selectedItemId}
              onSelect={(itemId) => setSelectedItemId(itemId)}
              onDeleted={() => {
                setSelectedItemId(undefined);
                fetchSearchResults();
              }}
              extraLabels={{
                [itemToSave?.spec.metadata.id ?? '']: { text: newItemLabel, color: 'var(--accent-color-blue)' }
              }}
              itemsToKeepAtTop={itemToSave === undefined ? [] : [itemToSave.spec.metadata.id]}
            />
          )}
        </div>

        <div className={s.LibraryItemEditor} ref={editorRef}>
          {((modeType === 'save' && resolvedItemToSave && itemToSaveMetadata) || (modeType === 'pick' && selectedItem)) && (
            <LibraryItemEditor
              mode={modeType === 'save' ? 'editor' : 'viewer'}
              value={modeType === 'save' ? { ...resolvedItemToSave!, spec: { ...itemToSave?.spec!, metadata: itemToSaveMetadata! } } : selectedItem!}
              onChange={setItemToSave}
              libraryContext={props.libraryContext}
            />
          )}
          {!selectedItemId && (
            <div style={{ padding: '12rem' }}>
              <NothingToShow content='Select an item to view or edit it.' />
            </div>
          )}
        </div>
      </div>

      <div className={s.Footer}>
        <Button
          type='regular'
          onClick={props.onCancel}
          text='Cancel'
        />
        {props.mode.type === 'pick' && (
          <Button
            disabled={!selectedItemId}
            onClick={() => {
              if (props.mode.type !== 'pick') return;
              if (selectedItem === undefined) return;

              props.mode.onPick(selectedItem.spec)
            }}
            type='primary'
            text='Select'
          />
        )}
        {props.mode.type === 'save' && (
          <Button
            disabled={!selectedItem || !selectedItem.spec.metadata.name}
            onClick={() => {
              const save = async () => {
                if (props.mode.type !== 'save') return;
                if (selectedItem === undefined) return;
                if (resolvedItemToSave === undefined) return;
                if (itemToSaveMetadata === undefined) return;
                if (itemToSave === undefined) return;

                const libraryItemMetadata: LibraryItemMetadata = {
                  ...selectedItem.metadata,
                  availableForContexts: searchEditorValue.resourceMatchers,
                  tags: searchEditorValue.tags,
                  updatedAt: new Date().toISOString()
                };

                const managedItem: ManagedItem = {
                  ...itemToSave.spec,
                  metadata: itemToSaveMetadata
                };

                await saveLibraryItem({
                  metadata: libraryItemMetadata,
                  spec: managedItem
                });

                modals.pop();
              }

              if (props.mode.type !== 'save') {
                return;
              }

              if (isOverwriteExistingItem) {
                modals.push({
                  id: 'save-library-item',
                  title: 'Save Library Item',
                  content: (
                    <ConfirmationDialog
                      content={(
                        <div>
                          Are you sure you want to overwrite this library item?
                          <br />
                          It will affect all other items where the item you are going to override is used by reference.
                        </div>
                      )}
                      onCancel={modals.pop}
                      onConfirm={save}
                      type='danger'
                    />
                  ),
                  styleMode: 'no-content-padding'
                });
                return;
              }

              save();
            }}
            type={props.mode.item.metadata.id === selectedItem?.spec.metadata.id ? 'primary' : 'danger'}
            text={(() => {
              if (props.mode.item.metadata.id === selectedItem?.spec.metadata.id) {
                const isNewItem = resolvedItemToSaveResult.type === 'not-found';
                return isNewItem ? 'Save' : 'Overwrite';
              }

              return 'Overwrite';
            })()}
          />
        )}
      </div>
    </div>
  );
}

export default LibraryBrowser;
