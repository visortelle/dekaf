import React from 'react';
import s from './SearchResults.module.css'
import Input from '../../Input/Input';
import { LibraryItem } from '../model/library';
import NothingToShow from '../../NothingToShow/NothingToShow';
import DeleteLibraryItemButton from './DeleteLibraryItemButton/DeleteLibraryItemButton';

export type SearchResultsProps = {
  items: LibraryItem[];
  onSelect: (id: string) => void;
  selectedItemId?: string;
};

const SearchResults: React.FC<SearchResultsProps> = (props) => {
  const [filterInputValue, setFilterInputValue] = React.useState<string>("")

  const filteredItems = React.useMemo(() => {
    return props.items.filter((item) => {
      const { name, descriptionMarkdown, id } = item.spec.metadata;
      return name.toLowerCase().includes(filterInputValue.toLowerCase()) ||
        descriptionMarkdown.toLowerCase().includes(filterInputValue.toLowerCase()) ||
        id.includes(filterInputValue)
    })
  }, [props.items, filterInputValue]);

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
            <DeleteLibraryItemButton itemId={props.selectedItemId} />
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
                    onClick={() => props.onSelect(id)}
                    selectedItemId={props.selectedItemId}
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
  onClick: () => void;
  selectedItemId?: string;
};

const Item: React.FC<ItemProps> = (props) => {
  const className = `${s.Item} ${props.selectedItemId === props.id ? s.ActiveItem : ''}`;

  return (
    <div className={className} onClick={props.onClick}>
      <div className={s.ItemName}>
        {props.name}
      </div>
      <div className={s.ItemDescription}>
        {props.descriptionMarkdown}
      </div>
    </div>
  );
}

export default SearchResults;
