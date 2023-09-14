import React from 'react';
import s from './SearchResults.module.css'
import Input from '../../Input/Input';

export type SearchResultsProps = {
  items: ItemProps[];
};

const SearchResults: React.FC<SearchResultsProps> = (props) => {
  return (
    <div className={s.SearchResults}>
      <div className={s.Filters}>
        <Input
          placeholder="Search by name or description"
          value={""}
          onChange={() => { }}
          appearance='no-borders'
        />
      </div>
      <div className={s.Items}>
        {props.items.map((item) => (
          <Item
            key={item.id}
            id={item.id}
            title={item.title}
            descriptionMarkdown={item.descriptionMarkdown.slice(0, 140)}
            onClick={item.onClick}
          />
        ))}
      </div>
    </div>
  );
}

export type ItemProps = {
  id: string;
  title: string;
  descriptionMarkdown: string;
  onClick: () => void;
};

const Item: React.FC<ItemProps> = (props) => {
  return (
    <div className={s.Item}>
      <div className={s.ItemTitle}>
        {props.title}
      </div>
      <div className={s.ItemDescription}>
        {props.descriptionMarkdown}
      </div>
    </div>
  );
}

export default SearchResults;
