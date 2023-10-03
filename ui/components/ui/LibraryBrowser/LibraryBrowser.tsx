import React from 'react';
import s from './LibraryBrowser.module.css'
import { LibraryItem } from './model/library';
import SearchEditor, { SearchEditorValue } from './SearchEditor/SearchEditor';
import SearchResults from './SearchResults/SearchResults';
import LibraryItemEditor from './LibraryItemEditor/LibraryItemEditor';
import Button from '../Button/Button';
import * as pb from "../../../grpc-web/tools/teal/pulsar/ui/library/v1/library_pb";
import { UserManagedItem, UserManagedItemType } from './model/user-managed-items';

export type LibraryBrowserMode = {
  type: 'save';
  itemToSave: UserManagedItem;
} | {
  type: 'pick';
  itemTypeToPick: UserManagedItemType;
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
  const [searchEditorValue, setSearchEditorValue] = React.useState<SearchEditorValue>(initialSearchEditorValue);
  const [searchResults, setSearchResults] = React.useState<LibraryItem[]>([]);
  const [selectedItem, setSelectedItem] = React.useState<LibraryItem | undefined>(props.mode.type === 'save' ? props.mode.itemToSave : undefined);

  const saveLibraryItem = async (item: LibraryItem) => {
    const req = new pb.SaveLibraryItemRequest();
    const itemPb =
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
              const item = searchResults.find(item => item.id === itemId);
              if (item === undefined) {
                console.error(`Could not find library item with id ${itemId}`);
                return;
              }

              setSelectedItem(item);
            }}
          />
        </div>

        <div className={s.LibraryItemEditor}>
          <LibraryItemEditor
            mode={props.mode.type === 'save' ? 'editor' : 'viewer'}
            value={selectedItem}
            onChange={setSelectedItem}
          />
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

              props.mode.onPick(selectedItem)
            }}
            type='primary'
            text='Select'
          />
        )}
        {props.mode.type === 'save' && (
          <Button
            disabled={!selectedItem || !selectedItem.name}
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
