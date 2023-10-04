import React, { useEffect, useState } from 'react';
import s from './LibraryBrowser.module.css'
import { LibraryItem, LibraryItemMetadata } from './model/library';
import SearchEditor, { SearchEditorValue } from './SearchEditor/SearchEditor';
import SearchResults from './SearchResults/SearchResults';
import LibraryItemEditor from './LibraryItemEditor/LibraryItemEditor';
import Button from '../Button/Button';
import * as pb from "../../../grpc-web/tools/teal/pulsar/ui/library/v1/library_pb";
import { UserManagedItem, UserManagedItemType } from './model/user-managed-items';
import NothingToShow from '../NothingToShow/NothingToShow';
import { libraryItemToPb } from './model/library-conversions';
import { useResolveLibraryItem } from './useResolveLibraryItem';
import { LibraryItemContext } from './model/library-item-context';

export type LibraryBrowserMode = {
  type: 'save';
  item: UserManagedItem;
  context: LibraryItemContext;
} | {
  type: 'pick';
  itemType: UserManagedItemType;
  onPick: (item: UserManagedItem) => void;
};

export type LibraryBrowserProps = {
  mode: LibraryBrowserMode;
  onCancel: () => void;
};

const initialSearchEditorValue: SearchEditorValue = {
  itemType: 'message-filter',
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
  const [searchEditorValue, setSearchEditorValue] = useState<SearchEditorValue>(initialSearchEditorValue);
  const [searchResults, setSearchResults] = useState<LibraryItem[]>([]);
  const resolvedLibraryItem = useResolveLibraryItem(props.mode.type === 'save' ? props.mode.item.metadata.id : undefined);
  const [selectedItem, setSelectedItem] = useState<LibraryItem | undefined>(undefined);

  useEffect(() => {
    if (resolvedLibraryItem.type === 'not-found' && props.mode.type === 'save') {
      const metadata = mkLibraryItemMetadata(props.mode.context, props.mode.item);
      const libraryItem: LibraryItem = {
        metadata,
        spec: props.mode.item
      };

      setSelectedItem(libraryItem);
    }

    if (resolvedLibraryItem.type === 'success') {
      setSelectedItem(resolvedLibraryItem.value);
    }
  }, [resolvedLibraryItem, props.mode]);

  function mkLibraryItemMetadata(context: LibraryItemContext, userManagedItem: UserManagedItem): LibraryItemMetadata {
    return {
      availableForContexts: [],
      revision: '',
      tags: [],
      updatedAt: new Date().toISOString()
    };
  }

  const saveLibraryItem = async (item: LibraryItem) => {
    const req = new pb.SaveLibraryItemRequest();
    const itemPb = libraryItemToPb(item);
    req.setItem(itemPb);
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
            items={[]}
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
            />
          )}
          {!selectedItem && (
            <NothingToShow content='Select an item to view or edit it.' />
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
