import React, { useEffect, useRef, useState } from 'react';
import s from './LibraryBrowser.module.css'
import { LibraryItem, LibraryItemMetadata } from './model/library';
import SearchEditor, { SearchEditorValue } from './SearchEditor/SearchEditor';
import SearchResults from './SearchResults/SearchResults';
import LibraryItemEditor from './LibraryItemEditor/LibraryItemEditor';
import Button, { ButtonProps } from '../Button/Button';
import * as pb from "../../../grpc-web/tools/teal/pulsar/ui/library/v1/library_pb";
import * as GrpcClient from '../../app/contexts/GrpcClient/GrpcClient';
import * as Notifications from '../../app/contexts/Notifications';
import * as Modals from '../../app/contexts/Modals/Modals';
import ConfirmationDialog from '../ConfirmationDialog/ConfirmationDialog';
import { ManagedItem, ManagedItemMetadata, ManagedItemType } from './model/user-managed-items';
import NothingToShow from '../NothingToShow/NothingToShow';
import { libraryItemFromPb, libraryItemToPb } from './model/library-conversions';
import { LibraryContext, resourceMatcherFromContext } from './model/library-context';
import { Code } from '../../../grpc-web/google/rpc/code_pb';
import { managedItemTypeToPb } from './model/user-managed-items-conversions-pb';
import { resourceMatcherToPb } from './model/resource-matchers-conversions-pb';
import { ResourceMatcher } from './model/resource-matchers';
import EditNameDialog from '../RenameButton/EditNameDialog/EditNameDialog';
import { cloneDeep } from 'lodash';

export type LibraryBrowserMode = {
  type: 'create-new-item';
  initialManagedItem: ManagedItem;
  onSave: (item: ManagedItem) => void;
  appearance?: 'save' | 'create' | 'edit'
} | {
  type: 'override-existing-item';
  initialManagedItem: ManagedItem;
  overrideId: string,
  onSave: (item: ManagedItem) => void;
  appearance?: 'save' | 'create' | 'edit'
} | {
  type: 'pick';
  itemType: ManagedItemType;
  onPick?: (item: ManagedItem) => void;
};

export type LibraryBrowserProps = {
  mode: LibraryBrowserMode;
  onCancel: () => void;
  libraryContext: LibraryContext;
  extraButtons?: { id: string, button: Omit<ButtonProps, 'onClick'>, onClick: (v: LibraryItem) => void }[],
  resourceMatchersOverride?: ResourceMatcher[]
  onSelect?: (id: string | undefined) => void
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
  const itemType = (props.mode.type === 'create-new-item' || props.mode.type === 'override-existing-item') ?
    props.mode.initialManagedItem.metadata.type :
    props.mode.itemType;

  const [searchValue, setSearchValue] = useState<SearchEditorValue>({
    itemType,
    resourceMatchers: props.resourceMatchersOverride === undefined ?
      [resourceMatcherFromContext(props.libraryContext)] :
      props.resourceMatchersOverride
  });
  const [searchResults, setSearchResults] = useState<SearchResultsState>({ type: 'pending' });

  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [selectedLibraryItem, setSelectedLibraryItem] = useState<LibraryItem | undefined>(undefined);
  const [newLibraryItem, setNewLibraryItem] = useState<LibraryItem | undefined>(undefined);

  const { notifyError, notifySuccess } = Notifications.useContext();
  const { libraryServiceClient } = GrpcClient.useContext();

  // XXX - this is very very bad, I know. :)
  const [saveItemRequested, setSaveItemRequested] = useState<boolean>(false);

  const modals = Modals.useContext();

  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function doSave() {
      await saveItem();
      setSaveItemRequested(false);
    }

    if (saveItemRequested) {
      doSave();
    }
  }, [saveItemRequested]);

  useEffect(() => {
    if (props.onSelect !== undefined) {
      props.onSelect(selectedId);
    }
  }, [selectedId]);

  useEffect(() => {
    if (props.mode.type !== 'create-new-item' && props.mode.type !== 'override-existing-item') {
      return;
    }

    const newNewLibraryItem: LibraryItem = {
      metadata: {
        availableForContexts: [resourceMatcherFromContext(props.libraryContext)],
        updatedAt: new Date().toISOString()
      },
      spec: props.mode.initialManagedItem
    };

    setNewLibraryItem(newNewLibraryItem);

    const newSelectedId = props.mode.type === 'override-existing-item' ?
      props.mode.overrideId :
      newNewLibraryItem.spec.metadata.id;

    setSelectedId(newSelectedId);
  }, [props.mode.type]);

  useEffect(() => {
    async function fetchSelectedLibraryItem() {
      if (selectedId === undefined) {
        return;
      }

      const req = new pb.GetLibraryItemRequest();
      req.setId(selectedId);

      const res = await libraryServiceClient.getLibraryItem(req, null)
        .catch(err => notifyError(`Unable to fetch library item metadata. ${err}`));

      if (res === undefined) {
        return;
      }

      const resCode = res.getStatus()?.getCode();
      if (!((resCode === Code.OK) || (resCode === Code.NOT_FOUND))) {
        notifyError(`Unable to fetch library item metadata. ${res.getStatus()?.getMessage()}`);
        return;
      }

      if (resCode === Code.NOT_FOUND) {
        notifyError(`Unable to find the item with id: ${selectedId}`);
        setSelectedId(undefined);
        fetchSearchResults();
        return;
      }

      if (resCode === Code.OK) {
        setSelectedLibraryItem(libraryItemFromPb(res.getItem()!));
        return;
      }
    }

    if (selectedId === newLibraryItem?.spec.metadata.id) {
      setSelectedLibraryItem(newLibraryItem);
      return;
    }

    fetchSelectedLibraryItem();
  }, [props.mode, selectedId]);

  async function fetchSearchResults() {
    const req = new pb.ListLibraryItemsRequest();

    const contextsList = searchValue.resourceMatchers.map(rm => resourceMatcherToPb(rm))
    req.setContextsList(contextsList);

    req.setTypesList([managedItemTypeToPb(searchValue.itemType)]);

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
    setSearchResults({ type: 'success', items });
  }

  useEffect(() => {
    fetchSearchResults();
  }, [searchValue, props.libraryContext]);

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

    if (props.mode.type === 'create-new-item' || props.mode.type === 'override-existing-item') {
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

  const isOverwriteExistingItem = (
    (props.mode.type === 'create-new-item' || props.mode.type === 'override-existing-item') &&
    (selectedId !== props.mode.initialManagedItem.metadata.id)
  );

  const modeType = props.mode.type;

  const isHideSearchResults = ((props.mode.type === "create-new-item" || props.mode.type === 'override-existing-item') && (props.mode.appearance === "create" || props.mode.appearance === "edit"));

  const pickItem = () => {
    if (props.mode.type !== 'pick') return;
    if (props.mode.onPick === undefined) return;
    if (selectedId === undefined) return;
    if (selectedLibraryItem === undefined) return;

    props.mode.onPick(selectedLibraryItem.spec);
  }

  const saveItem = () => {
    const save = async () => {
      if (props.mode.type !== 'create-new-item' && props.mode.type !== 'override-existing-item') return;
      if (selectedId === undefined) return;
      if (newLibraryItem === undefined) return;

      await saveLibraryItem(newLibraryItem!);

      modals.pop();
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
  }

  const setNameAndSaveLibraryName = () => {
    modals.push({
      id: 'set-library-item-name',
      title: `Set Library Item Name`,
      content: (
        <EditNameDialog
          initialValue={newLibraryItem?.spec.metadata.name || ''}
          onCancel={modals.pop}
          onConfirm={(v) => {
            if (newLibraryItem === undefined) {
              return;
            }

            if (searchResults.type !== 'success') {
              return;
            }

            const newNewLibraryItem = cloneDeep(newLibraryItem);
            newNewLibraryItem.spec.metadata.name = v;

            setNewLibraryItem(newNewLibraryItem);
            setSaveItemRequested(true);
          }}
        />
      ),
      styleMode: 'no-content-padding'
    });
  }

  return (
    <div className={s.LibraryBrowser}>
      <div
        className={s.Content}
        style={{ gridTemplateColumns: isHideSearchResults ? `400rem auto` : `400rem 400rem auto` }}
      >
        <div className={s.SearchEditor}>
          <SearchEditor
            mode={(props.mode.type === 'create-new-item' || props.mode.type === 'override-existing-item') ? {
              type: 'edit',
              onChange: setSearchValue,
              value: searchValue
            } : {
              type: "search",
              onChange: setSearchValue,
              value: searchValue
            }}
            libraryContext={props.libraryContext}
          />
        </div>

        {!isHideSearchResults && (
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
                items={searchResults.type === 'success' ? searchResults.items : []}
                selectedItemId={selectedId}
                onSelect={setSelectedId}
                onSelectAndConfirm={itemId => {
                  setSelectedId(itemId);

                  switch (props.mode.type) {
                    case 'pick': pickItem(); break;
                    case 'create-new-item': saveItem(); break;
                    case 'override-existing-item': saveItem(); break;
                  }
                }}
                onDeleted={() => {
                  setSelectedId(undefined);
                  fetchSearchResults();
                }}
                newLibraryItem={newLibraryItem}
              />
            )}
          </div>
        )}

        <div className={s.LibraryItemEditor} ref={editorRef}>
          {selectedLibraryItem !== undefined && (
            <LibraryItemEditor
              mode={modeType === 'pick' ? 'viewer' : 'editor'}
              value={selectedLibraryItem}
              onChange={setNewLibraryItem}
              libraryContext={props.libraryContext}
              libraryBrowserPanel={((props.mode.type === "create-new-item" || props.mode.type === 'override-existing-item') && (props.mode.appearance === "create" || props.mode.appearance === "edit")) ? { hiddenElements: ["save-button"] } : undefined}
            />
          )}
          {!selectedId && (
            <div style={{ padding: '12rem' }}>
              <NothingToShow content='No items selected.' />
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
        {props.extraButtons?.map(({ id, button, onClick }) => (
          <Button key={id} {...button} disabled={selectedLibraryItem === undefined} onClick={() => onClick(selectedLibraryItem!)} />
        ))}
        {props.mode.type === 'pick' && props.mode.onPick !== undefined && (
          <Button
            disabled={!selectedId}
            onClick={pickItem}
            type='primary'
            text='Select'
          />
        )}
        {(props.mode.type === 'create-new-item' || props.mode.type === 'override-existing-item') && (
          <Button
            disabled={!selectedId}
            onClick={newLibraryItem?.spec.metadata.name ? () => setSaveItemRequested(true) : setNameAndSaveLibraryName}
            type={props.mode.initialManagedItem.metadata.id === selectedId ? 'primary' : 'danger'}
            text={(() => {
              if (props.mode.appearance === 'create') {
                return 'Create';
              }

              if (props.mode.appearance === 'edit') {
                return 'Save';
              }

              if (props.mode.type === 'create-new-item' && props.mode.initialManagedItem.metadata.id === selectedId) {
                return 'Create';
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
