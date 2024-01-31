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
import * as Modals from '../../../app/contexts/Modals/Modals';
import { ManagedItemType } from '../model/user-managed-items';
import { ResourceMatcher } from '../model/resource-matchers';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import { libraryItemFromPb } from '../model/library-conversions';
import ActionButton from '../../ActionButton/ActionButton';
import EditItemDialog from '../dialogs/EditItemDialog/EditItemDialog';
import { LibraryContext } from '../model/library-context';
import CreateItemDialog from '../dialogs/CreateItemDialog/CreateItemDialog';

export type ExtraLabel = {
  text: string;
  color?: string;
}

export type SearchResultsProps = {
  itemType: ManagedItemType;
  resourceMatchers: ResourceMatcher[];
  items: LibraryItem[],
  selectedItemId: string | undefined;
  libraryContext: LibraryContext;
  onSelected: (itemId: string) => void;
  onItems: (items: LibraryItem[]) => void;
  onItemClick: (id: string) => void;
  onItemDoubleClick: (id: string) => void;
  onDeleted: (id: string) => void;
  onEdited: (id: string) => void;
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

      const newItems = res.getItemsList().map(libraryItemFromPb);
      props.onItems(newItems);
    }

    fetchSearchResults();
  }, [props.itemType, props.resourceMatchers]);

  useEffect(() => {
    if (props.selectedItemId === undefined && props.items.length > 0) {
      props.onSelected(props.items[0].spec.metadata.id);
    }
  }, [props.items, props.selectedItemId]);

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
      sortedItems = result.sort(sortFn);
    } else if (sort.sortBy === 'Last Modified') {
      const sortFn = (a: LibraryItem, b: LibraryItem) => a.metadata.updatedAt.localeCompare(b.metadata.updatedAt, 'en', { numeric: true });
      sortedItems = result.sort(sortFn);
    }

    sortedItems = sort.sortDirection === 'asc' ? sortedItems : sortedItems.reverse();

    return sortedItems;
  }, [props.items, filterInputValue, sort]);

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
                const id = item.spec.metadata.id;

                return (
                  <Item
                    libraryItem={item}
                    libraryContext={props.libraryContext}
                    onClick={() => {
                      props.onSelected(id);
                      props.onItemClick(id);
                    }}
                    onDoubleClick={() => {
                      props.onSelected(id);
                      props.onItemDoubleClick(id);
                    }}
                    selectedItemId={props.selectedItemId}
                    onDeleted={() => props.onDeleted(id)}
                    onEdited={() => props.onEdited(id)}
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
  libraryItem: LibraryItem;
  libraryContext: LibraryContext;
  onClick: () => void;
  onDoubleClick: () => void;
  onDeleted: () => void;
  onEdited: () => void;
  selectedItemId?: string;
  isNewItem?: boolean
};

const Item: React.FC<ItemProps> = (props) => {
  const modals = Modals.useContext();
  const className = `${s.Item} ${props.selectedItemId === props.libraryItem.spec.metadata.id ? s.ActiveItem : ''}`;
  const i18n = I18n.useContext();

  return (
    <div className={className} onClick={props.onClick} onDoubleClick={props.onDoubleClick}>
      <div className={s.ItemName}>
        {props.libraryItem.spec.metadata.name || <div className={s.Unnamed}>Unnamed</div>}
      </div>
      <div className={s.ItemUpdatedAt}>
        Updated at:<br />{i18n.formatDateTime(new Date(props.libraryItem.metadata.updatedAt))}
      </div>
      {props.isNewItem && (
        <div className={s.ItemExtraLabel} style={{ color: 'var(--accent-color-blue)' }}>
          New item
        </div>
      )}

      {!props.isNewItem && (
        <div className={s.ActionButtons}>
          <ActionButton
            action={{ type: 'predefined', action: 'edit' }}
            buttonProps={{ appearance: 'borderless-semitransparent' }}
            onClick={() => {
              modals.push({
                id: `edit-library-item-${props.libraryItem.spec.metadata.id}`,
                title: `Edit Library Item`,
                content: (
                  <div>
                    <CreateItemDialog
                      libraryItem={props.libraryItem}
                      libraryContext={props.libraryContext}
                      onCreated={props.onEdited}
                      onCanceled={modals.pop}
                      isExistingItem={true}
                    />
                  </div>
                ),
                styleMode: 'no-content-padding'
              });
            }}
          />
          <DeleteLibraryItemButton
            itemId={props.libraryItem.spec.metadata.id}
            onDeleted={props.onDeleted}
            isDisabled={props.libraryItem.spec.metadata.name.length === 0}
          />
        </div>
      )}
    </div>
  );
}

export default SearchResults;
