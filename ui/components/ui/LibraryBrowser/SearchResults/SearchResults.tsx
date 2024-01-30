import React, { useEffect } from 'react';
import s from './SearchResults.module.css'
import Input from '../../Input/Input';
import { LibraryItem } from '../model/library';
import NothingToShow from '../../NothingToShow/NothingToShow';
import DeleteLibraryItemButton from './DeleteLibraryItemButton/DeleteLibraryItemButton';
import SortInput, { Sort } from '../../SortInput/SortInput';
import * as I18n from '../../../app/contexts/I18n/I18n';
import { managedItemTypeToPb } from '../model/user-managed-items-conversions-pb';
import { resourceMatcherToPb } from '../model/resource-matchers-conversions-pb';
import * as pb from "../../../../grpc-web/tools/teal/pulsar/ui/library/v1/library_pb";
import * as GrpcClient from '../../../app/contexts/GrpcClient/GrpcClient';
import * as Notifications from '../../../app/contexts/Notifications';
import { ManagedItemType } from '../model/user-managed-items';
import { ResourceMatcher } from '../model/resource-matchers';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import { libraryItemFromPb } from '../model/library-conversions';

export type ExtraLabel = {
  text: string;
  color?: string;
}

export type SearchResultsProps = {
  itemType: ManagedItemType;
  resourceMatchers: ResourceMatcher[];
  items: LibraryItem[],
  onItems: (items: LibraryItem[]) => void;
  onItemClick: (id: string) => void;
  onItemDoubleClick: (id: string) => void;
  onDeleted: () => void;
  selectedItemId?: string;
  newLibraryItem?: LibraryItem;
};

type SortOption = 'Name' | 'Last Modified';

const SearchResults: React.FC<SearchResultsProps> = (props) => {
  const { libraryServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const [filterInputValue, setFilterInputValue] = React.useState<string>("")
  const [sort, setSort] = React.useState<Sort<SortOption>>({ sortBy: 'Name', sortDirection: 'asc' });

  useEffect(() => {
    async function fetchSearchResults() {
      const req = new pb.ListLibraryItemsRequest();

      const contextsList = props.resourceMatchers.map(rm => resourceMatcherToPb(rm))
      req.setContextsList(contextsList);
      req.setTypesList([managedItemTypeToPb(props.itemType)]);

      const res = await libraryServiceClient.listLibraryItems(req, null)
        .catch(err => {
          notifyError(`Unable to fetch library items. ${err}`);
        });

      if (res === undefined) {
        return;
      }

      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to fetch library items. ${res.getStatus()?.getMessage()}`);
        return;
      }

      props.onItems(res.getItemsList().map(libraryItemFromPb));
    }

    fetchSearchResults();
  }, [props.itemType, props.resourceMatchers]);

  const filteredItems = React.useMemo(() => {
    let result = props.items.filter((item) => {
      const { name, descriptionMarkdown, id } = item.spec.metadata;
      return name.toLowerCase().includes(filterInputValue.toLowerCase()) ||
        descriptionMarkdown.toLowerCase().includes(filterInputValue.toLowerCase()) ||
        id.includes(filterInputValue);
    });

    let sortedItems: LibraryItem[] = result;
    if (sort.sortBy === 'Name') {
      const sortFn = (a: LibraryItem, b: LibraryItem) => a.spec.metadata.name.localeCompare(b.spec.metadata.name, 'en', { numeric: true });
      sortedItems = props.items.sort(sortFn);
    } else if (sort.sortBy === 'Last Modified') {
      const sortFn = (a: LibraryItem, b: LibraryItem) => a.metadata.updatedAt.localeCompare(b.metadata.updatedAt, 'en', { numeric: true });
      sortedItems = props.items.sort(sortFn);
    }

    sortedItems = sort.sortDirection === 'asc' ? sortedItems : sortedItems.reverse();

    if (props.newLibraryItem !== undefined) {
      sortedItems = [props.newLibraryItem].concat(sortedItems);
    }

    return sortedItems;
  }, [props.items, filterInputValue, sort, props.newLibraryItem]);

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
                const isNewItem = id === props.newLibraryItem?.spec.metadata.id;

                return (
                  <Item
                    key={id}
                    id={id}
                    name={name}
                    descriptionMarkdown={descriptionMarkdown.slice(0, 140)}
                    updatedAt={item.metadata.updatedAt}
                    onClick={() => props.onItemClick(id)}
                    onDoubleClick={() => props.onItemDoubleClick(id)}
                    selectedItemId={props.selectedItemId}
                    onDeleted={props.onDeleted}
                    isNewItem={isNewItem}
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
  onDoubleClick: () => void;
  onDeleted: () => void;
  selectedItemId?: string;
  isNewItem?: boolean
};

const Item: React.FC<ItemProps> = (props) => {
  const className = `${s.Item} ${props.selectedItemId === props.id ? s.ActiveItem : ''}`;
  const i18n = I18n.useContext();

  return (
    <div className={className} onClick={props.onClick} onDoubleClick={props.onDoubleClick}>
      <div className={s.ItemName}>
        {props.name || <div className={s.Unnamed}>Unnamed</div>}
      </div>
      <div className={s.ItemUpdatedAt}>
        Updated at:<br />{i18n.formatDateTime(new Date(props.updatedAt))}
      </div>
      {props.isNewItem && (
        <div className={s.ItemExtraLabel} style={{ color: 'var(--accent-color-blue)' }}>
          New item
        </div>
      )}
      {!props.isNewItem && (
        <div className={s.DeleteItemButton}>
          <DeleteLibraryItemButton
            itemId={props.id}
            onDeleted={props.onDeleted}
            isDisabled={props.name.length === 0}
          />
        </div>
      )}
    </div>
  );
}

export default SearchResults;
