import React from 'react';
import s from './LibraryBrowser.module.css'
import { LibraryItemDescriptor, LibraryItemType } from './types';
import SearchEditor, { SearchEditorValue } from './SearchEditor/SearchEditor';
import SearchResults, { ItemProps } from './SearchResults/SearchResults';
import LibraryItemEditor from './LibraryItemEditor/LibraryItemEditor';
import Button from '../Button/Button';

export type LibraryBrowserMode = {
  type: 'editor';
  itemType: LibraryItemType;
  itemId: string;
} | {
  type: 'picker';
  itemType: LibraryItemType;
  onPick: (descriptor: LibraryItemDescriptor) => void;
};

export type LibraryBrowserProps = {
  mode: LibraryBrowserMode;
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

const fakeItems: ItemProps[] = Array.from({ length: 100 }).map((_, index) => ({
  id: `${index}`,
  title: `Item ${index}`.repeat(20),
  descriptionMarkdown: `This is item ${index}`.repeat(20),
  onClick: () => {}
}));

const LibraryBrowser: React.FC<LibraryBrowserProps> = (props) => {
  const [searchEditorValue, setSearchEditorValue] = React.useState<SearchEditorValue>(initialSearchEditorValue);
  const [selectedItem, setSelectedItem] = React.useState<ItemProps | undefined>(undefined);

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
            items={fakeItems}
          />
        </div>

        <div className={s.LibraryItemViewer}>
            <LibraryItemEditor
              mode={props.mode.type === 'editor' ? 'editor' : 'viewer'}
            />
        </div>
      </div>

      <div className={s.Footer}>
       {props.mode.type === 'picker' && (
        <Button
         onClick={() => props.mode.onPick({})}
         type='primary'

        />
       )}
      </div>
    </div>
  );
}

export default LibraryBrowser;
