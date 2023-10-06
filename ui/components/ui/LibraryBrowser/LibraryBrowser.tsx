import React, { useEffect, useState } from 'react';
import s from './LibraryBrowser.module.css'
import { LibraryItem, LibraryItemMetadata } from './model/library';
import SearchEditor, { SearchEditorValue } from './SearchEditor/SearchEditor';
import SearchResults from './SearchResults/SearchResults';
import LibraryItemEditor from './LibraryItemEditor/LibraryItemEditor';
import Button from '../Button/Button';
import * as pb from "../../../grpc-web/tools/teal/pulsar/ui/library/v1/library_pb";
import * as GrpcClient from '../../app/contexts/GrpcClient/GrpcClient';
import * as Notifications from '../../app/contexts/Notifications';
import { UserManagedItem, UserManagedItemType } from './model/user-managed-items';
import NothingToShow from '../NothingToShow/NothingToShow';
import { libraryItemFromPb, libraryItemToPb } from './model/library-conversions';
import { useResolveLibraryItem } from './useResolveLibraryItem';
import { LibraryContext, resourceMatcherFromContext } from './model/library-context';
import { Code } from '../../../grpc-web/google/rpc/code_pb';
import { pulsarResourceToFqn } from '../../pulsar/pulsar-resources';
import { userManagedItemTypeToPb } from './model/user-managed-items-conversions-pb';

export type LibraryBrowserMode = {
  type: 'save';
  item: UserManagedItem;
  onSave: () => void;
} | {
  type: 'pick';
  itemType: UserManagedItemType;
  onPick: (item: UserManagedItem) => void;
};

export type LibraryBrowserProps = {
  mode: LibraryBrowserMode;
  onCancel: () => void;
  libraryContext: LibraryContext;
};

const initialSearchEditorValue: SearchEditorValue = {
  itemType: 'message-filter',
  tags: [],
  resourceMatcher: {
    type: 'topic-matcher',
    value: {
      persistency: 'any',
      type: 'exact-topic-matcher',
      topic: '',
      namespace: {
        type: 'namespace-matcher',
        value: {
          type: 'exact-namespace-matcher',
          namespace: '',
          tenant: {
            type: 'tenant-matcher',
            value: {
              type: 'exact-tenant-matcher',
              tenant: ''
            }
          }
        }
      }
    }
  }
}

const LibraryBrowser: React.FC<LibraryBrowserProps> = (props) => {
  const itemType = props.mode.type === 'save' ? props.mode.item.metadata.type : props.mode.itemType;

  const [searchEditorValue, setSearchEditorValue] = useState<SearchEditorValue>({ ...initialSearchEditorValue, itemType });
  const [searchResults, setSearchResults] = useState<LibraryItem[]>([]);
  const resolvedLibraryItem = useResolveLibraryItem(props.mode.type === 'save' ? props.mode.item.metadata.id : undefined);
  const [selectedItem, setSelectedItem] = useState<LibraryItem | undefined>(undefined);
  const { notifyError, notifySuccess } = Notifications.useContext();
  const { libraryServiceClient } = GrpcClient.useContext();

  useEffect(() => {
    async function selectItem() {
      async function mkLibraryItemMetadata(context: LibraryContext): Promise<LibraryItemMetadata> {
        return {
          availableForContexts: [resourceMatcherFromContext(context)],
          tags: [],
          updatedAt: new Date().toISOString()
        };
      }

      if (resolvedLibraryItem.type === 'not-found' && props.mode.type === 'save') {
        const metadata = await mkLibraryItemMetadata(props.libraryContext);
        const libraryItem: LibraryItem = {
          metadata,
          spec: props.mode.item
        };

        setSelectedItem(libraryItem);
        setSearchEditorValue((v) => ({ ...v, resourceMatcher: resourceMatcherFromContext(props.libraryContext) }));
      }

      if (resolvedLibraryItem.type === 'success') {
        setSelectedItem(resolvedLibraryItem.value);
      }
    }

    selectItem();
  }, [resolvedLibraryItem, props.mode]);

  useEffect(() => {
    async function fetchSearchResults() {
      const req = new pb.ListLibraryItemsRequest();
      req.setContextFqnsList([pulsarResourceToFqn(props.libraryContext.pulsarResource)]);
      req.setTypesList([userManagedItemTypeToPb(searchEditorValue.itemType)]);
      req.setTagsList(searchEditorValue.tags);

      const res = await libraryServiceClient.listLibraryItems(req, null)
        .catch(err => notifyError(`Unable to fetch library items. ${err}`));

      if (res === undefined) {
        return;
      }

      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to fetch library items. ${res.getStatus()?.getMessage()}`);
        return;
      }

      const items = res.getItemsList().map(libraryItemFromPb);
      setSearchResults(items);
    }

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
            <li><strong>Id:</strong> {item.spec.metadata.id}</li>
          </ul>
        </div>
      );
      props.mode.onSave();
    }
  };

  return (
    <div className={s.LibraryBrowser}>
      <div className={s.Content}>
        <div className={s.SearchEditor}>
          <SearchEditor
            mode={{
              type: 'edit',
              onChange: setSearchEditorValue,
              value: searchEditorValue
            }}
          />
        </div>

        <div className={s.SearchResults}>
          <SearchResults
            items={searchResults}
            selectedItemId={selectedItem?.spec.metadata.id}
            onSelect={(itemId) => {
              const item = searchResults.find(item => item.spec.metadata.id === itemId);
              if (item === undefined) {
                console.error(`Could not find library item with id ${itemId}`);
                return;
              }

              setSelectedItem(item);
            }}
          />
        </div>

        <div className={s.LibraryItemEditor}>
          {selectedItem && (
            <LibraryItemEditor
              mode={props.mode.type === 'save' ? 'editor' : 'viewer'}
              value={selectedItem}
              onChange={setSelectedItem}
              libraryContext={props.libraryContext}
            />
          )}
          {!selectedItem && (
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
            disabled={!selectedItem}
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
            onClick={async () => {
              if (props.mode.type !== 'save') return;
              if (selectedItem === undefined) return;

              await saveLibraryItem(selectedItem);
            }}
            type='primary'
            text='Save'
          />
        )}
      </div>
    </div>
  );
}

export default LibraryBrowser;
