import React, { useEffect, useState } from 'react';
import s from './Library.module.css'
import * as Notifications from '../../../app/contexts/Notifications';
import * as GrpcClient from '../../../app/contexts/GrpcClient/GrpcClient';
import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/library/v1/library_pb';
import { LibraryContext, resourceMatcherFromContext } from '../../LibraryBrowser/model/library-context';
import SaveLibraryItemButton from '../../LibraryBrowser/LibraryBrowserPanel/LibraryBrowserButtons/SaveLibraryItemButton/SaveLibraryItemButton';
import { ManagedItemType } from '../../LibraryBrowser/model/user-managed-items';
import { getReadableItemType } from '../../LibraryBrowser/get-readable-item-type';
import { managedItemTypeToPb } from '../../LibraryBrowser/model/user-managed-items-conversions-pb';
import { resourceMatcherToPb } from '../../LibraryBrowser/model/resource-matchers-conversions-pb';
import { Code } from '../../../../grpc-web/google/rpc/code_pb';
import { itemCountPerTypeFromPb } from '../../LibraryBrowser/item-count-per-type';
import NoData from '../../NoData/NoData';
import FormLabel from '../../ConfigurationTable/FormLabel/FormLabel';
import { help } from '../../LibraryBrowser/LibraryBrowserPanel/help';
import BrowseLibraryButton from './BrowseLibraryItemButton/BrowseLibraryButton';
import { ResourceMatcher } from '../../LibraryBrowser/model/resource-matchers';
import ResourceMatchersInput from '../../LibraryBrowser/SearchEditor/ResourceMatchersInput/ResourceMatchersInput';
import { H3 } from '../../H/H';
import { getDefaultLibraryItem } from '../../LibraryBrowser/default-library-items';

export type LibraryProps = {
  libraryContext: LibraryContext,
  onCount: (v: number) => void
};

const itemTypes: ManagedItemType[] = [
  "consumer-session-config",
  "consumer-session-target",
  "topic-selector",
  "message-filter",
  "message-filter-chain",
  "consumer-session-start-from",
  "coloring-rule",
  "coloring-rule-chain",
  "markdown-document",
  "basic-message-filter-target",
  "value-projection",
  "value-projection-list"
];

const Library: React.FC<LibraryProps> = (props) => {
  const [itemCountPerType, setItemCountPerType] = useState<Partial<Record<ManagedItemType, number>>>({});
  const [resourceMatchers, setResourceMatchers] = useState<ResourceMatcher[]>([]);
  const [refreshItemCountKey, setRefreshItemCountKey] = useState(0);

  useEffect(() => {
    setResourceMatchers([resourceMatcherFromContext(props.libraryContext)]);
  }, [props.libraryContext]);

  useEffect(() => {
    const count = Object.values(itemCountPerType)
      .filter(it => it !== undefined)
      .reduce((total, n) => total + n, 0);

    props.onCount(count);
  }, [itemCountPerType]);

  return (
    <div className={s.Library}>
      <div className={s.Help}>
        Library allows you to create and reuse various objects.
      </div>

      <div>
        {
          itemTypes.map(itemType => {
            const itemCount = itemCountPerType[itemType];

            return (
              <div key={itemType}>
                <div className={s.ItemType}>
                  <div className={s.ItemTypeHeader}>
                    <div style={{ marginRight: '24rem' }}>
                      <FormLabel
                        content={getReadableItemType(itemType)}
                        help={help[itemType]}
                      />
                    </div>

                    {itemCountPerType[itemType] === undefined && (
                      <div style={{ display: 'flex', justifySelf: 'center', marginLeft: '-12rem' }}>
                        <NoData />
                      </div>
                    )}

                    <BrowseLibraryButton
                      key={refreshItemCountKey}
                      itemType={itemType}
                      libraryContext={props.libraryContext}
                      availableForContexts={resourceMatchers}
                      onItemCount={(itemCount) => {
                        setItemCountPerType(v => ({
                          ...v,
                          [itemType]: itemCount
                        }));
                      }}
                    />

                    <SaveLibraryItemButton
                      item={getDefaultLibraryItem(itemType, props.libraryContext).spec}
                      libraryContext={props.libraryContext}
                      onSaved={() => setRefreshItemCountKey(v => v + 1)}
                    />
                  </div>
                </div>
              </div>
            );
          })
        }
      </div>

      <div className={s.ResourceMatchers}>
        <H3>Search in Contexts</H3>

        <ResourceMatchersInput
          value={resourceMatchers}
          onChange={setResourceMatchers}
          libraryContext={props.libraryContext}
        />
      </div>
    </div>
  );
}

export default Library;
