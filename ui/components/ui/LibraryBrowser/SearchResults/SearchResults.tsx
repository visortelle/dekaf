import React from 'react';
import s from './SearchResults.module.css'
import Input from '../../Input/Input';
import { LibraryItem } from '../types';
import NothingToShow from '../../NothingToShow/NothingToShow';

export type SearchResultsProps = {
  items: LibraryItem[];
  onSelect: (id: string) => void;
};

const SearchResults: React.FC<SearchResultsProps> = (props) => {
  const [nameAndDescriptionFilter, setNameAndDescriptionFilter] = React.useState<string>("")

  const filteredItems = React.useMemo(() => {
    return props.items.filter((item) => {
      return item.name.toLowerCase().includes(nameAndDescriptionFilter.toLowerCase()) ||
        item.descriptionMarkdown.toLowerCase().includes(nameAndDescriptionFilter.toLowerCase())
    })
  }, [props.items, nameAndDescriptionFilter]);

  return (
    <div className={s.SearchResults}>
      {filteredItems.length === 0 && (
        <div className={s.NothingToShow}>
          <NothingToShow />
        </div>
      )}
      {filteredItems.length > 0 && (
        <>
          <div className={s.Filters}>
            <Input
              placeholder="Search by name or description"
              value={nameAndDescriptionFilter}
              onChange={setNameAndDescriptionFilter}
              appearance='no-borders'
            />
          </div>
          <div className={s.Items}>
            {filteredItems.map((item) => (
              <Item
                key={item.id}
                id={item.id}
                name={item.name}
                descriptionMarkdown={item.descriptionMarkdown.slice(0, 140)}
                onClick={() => props.onSelect(item.id)}
              />
            ))}
          </div>
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
};

const Item: React.FC<ItemProps> = (props) => {
  return (
    <div className={s.Item}>
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
