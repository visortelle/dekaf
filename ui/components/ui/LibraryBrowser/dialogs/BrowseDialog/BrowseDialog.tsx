import React, { useEffect, useState } from 'react';
import s from './BrowseDialog.module.css'
import LibraryItemEditor from '../../LibraryItemEditor/LibraryItemEditor';
import { LibraryItem } from '../../model/library';
import { LibraryContext, resourceMatcherFromContext } from '../../model/library-context';
import Button from '../../../Button/Button';
import * as pb from '../../../../../grpc-web/tools/teal/pulsar/ui/library/v1/library_pb';
import { libraryItemFromPb } from '../../model/library-conversions';
import * as GrpcClient from '../../../../app/contexts/GrpcClient/GrpcClient';
import * as Notifications from '../../../../app/contexts/Notifications';
import { Code } from '../../../../../grpc-web/google/rpc/code_pb';
import FormItem from '../../../ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../../ConfigurationTable/FormLabel/FormLabel';
import { H3 } from '../../../H/H';
import ResourceMatchersInput from '../../SearchEditor/ResourceMatchersInput/ResourceMatchersInput';
import SearchResults from '../../SearchResults/SearchResults';
import { ResourceMatcher } from '../../model/resource-matchers';
import { ManagedItemType } from '../../model/user-managed-items';

export type BrowseDialogProps = {
  itemType: ManagedItemType,
  libraryContext: LibraryContext,
  onCanceled: () => void,
  onSelected: (libraryItem: LibraryItem) => void
};

const BrowseDialog: React.FC<BrowseDialogProps> = (props) => {
  const { libraryServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const [selectedItem, setSelectedItem] = useState<LibraryItem | undefined>(undefined);
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(undefined);
  const [searchResults, setSearchResults] = useState<LibraryItem[]>([]);
  const [searchInContexts, setSearchInContexts] = useState<ResourceMatcher[]>([resourceMatcherFromContext(props.libraryContext)]);
  const [isCallSelectedOnFetch, setIsCallSelectedOnFetch] = useState(false);

  useEffect(() => {
    async function fetchLibraryItem() {
      if (selectedItemId === undefined) {
        return;
      }

      const req = new pb.GetLibraryItemRequest();
      req.setId(selectedItemId);

      const res = await libraryServiceClient.getLibraryItem(req, null)
        .catch(err => notifyError(`Unable to fetch library item ${selectedItemId}. ${err}`));

      if (res === undefined) {
        return;
      }

      const resCode = res.getStatus()?.getCode();
      if (!((resCode === Code.OK) || (resCode === Code.NOT_FOUND))) {
        notifyError(`Unable to fetch library item ${selectedItemId}. ${res.getStatus()?.getMessage()}`);
        setIsCallSelectedOnFetch(false);
        return;
      }

      if (resCode === Code.NOT_FOUND) {
        notifyError(`Unable to find the item with id: ${selectedItemId}`);
        setIsCallSelectedOnFetch(false);
        return;
      }

      if (resCode === Code.OK) {
        const fetchedItem =  libraryItemFromPb(res.getItem()!);
        setSelectedItem(fetchedItem);

        if (isCallSelectedOnFetch && fetchedItem.spec.metadata.id === selectedItemId) {
          props.onSelected(fetchedItem);
        }

        setIsCallSelectedOnFetch(false);
        return;
      }
    }

    fetchLibraryItem();
  }, [selectedItemId]);

  return (
    <div className={s.BrowseDialog}>
      <div className={s.Content}>
        <div className={s.SearchInContexts}>
          <FormItem>
            <FormLabel
              content={<H3>Search in contexts</H3>}
            />
            {selectedItem !== undefined && (
              <ResourceMatchersInput
                value={searchInContexts}
                onChange={setSearchInContexts}
                libraryContext={props.libraryContext}
                isReadOnly={true}
              />
            )}
          </FormItem>
        </div>

        <div className={s.SearchResults}>
          <SearchResults
            itemType={props.itemType}
            resourceMatchers={searchInContexts}
            items={searchResults}
            onItems={setSearchResults}
            onDeleted={() => { }}
            onItemClick={() => {}}
            onItemDoubleClick={() => {
              setIsCallSelectedOnFetch(true);
            }}
            onSelected={setSelectedItemId}
            selectedItemId={selectedItemId}
          />
        </div>

        <div className={s.Editor}>
          {selectedItem !== undefined && (
            <LibraryItemEditor
              mode={'viewer'}
              value={selectedItem}
              onChange={() => { }}
              libraryContext={props.libraryContext}
              libraryBrowserPanel={{ hiddenElements: ["save-button"] }}
            />
          )}
        </div>
      </div>

      <div className={s.Footer}>
        <Button
          type='regular'
          text='Cancel'
          onClick={props.onCanceled}
        />
        <Button
          type='regular'
          text='Edit'
          onClick={() => { }}
        />
        <Button
          type='primary'
          text='Select'
          disabled={selectedItem === undefined}
          onClick={() => {
            if (selectedItem !== undefined) {
              props.onSelected(selectedItem);
            }
          }}
        />
      </div>
    </div>
  );
}

export default BrowseDialog;
