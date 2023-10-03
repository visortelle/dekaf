import React from 'react';
import s from './SearchResults.module.css'
import Input from '../../Input/Input';
import { LibraryItem } from '../model/library';
import NothingToShow from '../../NothingToShow/NothingToShow';

export type SearchResultsProps = {
  items: LibraryItem[];
  onSelect: (id: string) => void;
};

const SearchResults: React.FC<SearchResultsProps> = (props) => {
  const [nameAndDescriptionFilter, setNameAndDescriptionFilter] = React.useState<string>("")

  const filteredItems = React.useMemo(() => {
    return props.items.filter((item) => {
      const { name, descriptionMarkdown } = item.spec.metadata;
      return name.toLowerCase().includes(nameAndDescriptionFilter.toLowerCase()) ||
        descriptionMarkdown.toLowerCase().includes(nameAndDescriptionFilter.toLowerCase())
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
            {filteredItems.map((item) => {
              const { id, name, descriptionMarkdown } = item.spec.metadata;
              return (
                <Item
                  key={id}
                  id={id}
                  name={name}
                  descriptionMarkdown={descriptionMarkdown.slice(0, 140)}
                  onClick={() => props.onSelect(id)}
                />
              )
            })}
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
