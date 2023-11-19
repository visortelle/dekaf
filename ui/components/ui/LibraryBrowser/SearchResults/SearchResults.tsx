import React from 'react';
import s from './SearchResults.module.css'
import Input from '../../Input/Input';
import { LibraryItem } from '../model/library';
import NothingToShow from '../../NothingToShow/NothingToShow';
import DeleteLibraryItemButton from './DeleteLibraryItemButton/DeleteLibraryItemButton';
import SortInput, { Sort } from '../../SortInput/SortInput';
import * as I18n from '../../../app/contexts/I18n/I18n';
import partition from 'lodash/partition';
import { newItemLabel } from '../LibraryBrowser';

export type ExtraLabel = {
  text: string;
  color?: string;
}

export type SearchResultsProps = {
  items: LibraryItem[];
  selectedItemId?: string;
  onSelect: (id: string) => void;
  onDeleted: () => void;
  extraLabels: Record<string, ExtraLabel>;
  itemsToKeepAtTop: string[];
};

type SortOption = 'Name' | 'Last Modified';

const SearchResults: React.FC<SearchResultsProps> = (props) => {
  const [filterInputValue, setFilterInputValue] = React.useState<string>("")
  const [sort, setSort] = React.useState<Sort<SortOption>>({ sortBy: 'Name', sortDirection: 'asc' });

  const filteredItems = React.useMemo(() => {
    let result = props.items.filter((item) => {
      const { name, descriptionMarkdown, id } = item.spec.metadata;
      return name.toLowerCase().includes(filterInputValue.toLowerCase()) ||
        descriptionMarkdown.toLowerCase().includes(filterInputValue.toLowerCase()) ||
        id.includes(filterInputValue)
    })

    const [topItems, bottomItems] = partition(result, (item) => props.itemsToKeepAtTop.includes(item.spec.metadata.id));
    let sortedTopItems = topItems;
    let sortedBottomItems = bottomItems;

    if (sort.sortBy === 'Name') {
      const sortFn = (a: LibraryItem, b: LibraryItem) => a.spec.metadata.name.localeCompare(b.spec.metadata.name, 'en', { numeric: true });
      sortedTopItems = topItems.sort(sortFn);
      sortedBottomItems = bottomItems.sort(sortFn);
    } else if (sort.sortBy === 'Last Modified') {
      const sortFn = (a: LibraryItem, b: LibraryItem) => a.metadata.updatedAt.localeCompare(b.metadata.updatedAt, 'en', { numeric: true });
      sortedTopItems = topItems.sort(sortFn);
      sortedBottomItems = bottomItems.sort(sortFn);
    }

    sortedTopItems = sort.sortDirection === 'asc' ? sortedTopItems : sortedTopItems.reverse();
    sortedBottomItems = sort.sortDirection === 'asc' ? sortedBottomItems : sortedBottomItems.reverse();

    return sortedTopItems.concat(sortedBottomItems);
  }, [props.items, props.itemsToKeepAtTop, filterInputValue, sort]);

  return (
    <div className={s.SearchResults}>
      {(
        <>
          <div className={s.Filters}>
            <Input
              placeholder="Search by name, description, or id"
              value={filterInputValue}
              onChange={setFilterInputValue}
              appearance='no-borders'
              clearable
            />
          </div>
          <div className={s.Toolbar}>
            <div style={{ display: 'inline-flex' }}>
              <SortInput<SortOption>
                options={['Name', 'Last Modified']}
                value={sort}
                onChange={setSort}
              />
            </div>
            <DeleteLibraryItemButton
              itemId={props.selectedItemId}
              onDeleted={props.onDeleted}
              isDisabled={Object.values(props.extraLabels).find(el => el.text === newItemLabel) !== undefined}
            />
          </div>
          {filteredItems.length === 0 && (
            <div className={s.NothingToShow}>
              <NothingToShow />
            </div>
          )}
          {filteredItems.length !== 0 && (
            <div className={s.Items}>
              {filteredItems.map((item) => {
                const { id, name, descriptionMarkdown } = item.spec.metadata;
                return (
                  <Item
                    key={id}
                    id={id}
                    name={name}
                    descriptionMarkdown={descriptionMarkdown.slice(0, 140)}
                    updatedAt={item.metadata.updatedAt}
                    onClick={() => props.onSelect(id)}
                    selectedItemId={props.selectedItemId}
                    extraLabel={props.extraLabels[id]}
                  />
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export type ItemProps = {
  id: string;
  name: string;
  descriptionMarkdown: string;
  updatedAt: string;
  onClick: () => void;
  selectedItemId?: string;
  extraLabel?: ExtraLabel;
};

const Item: React.FC<ItemProps> = (props) => {
  const className = `${s.Item} ${props.selectedItemId === props.id ? s.ActiveItem : ''}`;
  const i18n = I18n.useContext();

  return (
    <div className={className} onClick={props.onClick}>
      <div className={s.ItemName}>
        {props.name || <div className={s.Unnamed}>Unnamed</div>}
      </div>
      <div className={s.ItemDescription}>
        {props.descriptionMarkdown}
      </div>
      <div className={s.ItemUpdatedAt}>
        Updated at: {i18n.formatDateTime(new Date(props.updatedAt))}
      </div>
      {props.extraLabel && (
        <div className={s.ItemExtraLabel} style={{ color: props.extraLabel.color }}>
          {props.extraLabel.text}
        </div>
      )}
    </div>
  );
}

export default SearchResults;
