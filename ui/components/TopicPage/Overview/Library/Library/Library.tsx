import React, { useEffect, useState } from 'react';
import s from './Library.module.css'
import * as Notifications from '../../../../app/contexts/Notifications';
import * as GrpcClient from '../../../../app/contexts/GrpcClient/GrpcClient';
import * as pb from '../../../../../grpc-web/tools/teal/pulsar/ui/library/v1/library_pb';
import { LibraryContext, resourceMatcherFromContext } from '../../../../ui/LibraryBrowser/model/library-context';
import CreateLibraryItemButton from './CreateLibraryItemButton/CreateLibraryItemButton';
import { ManagedItemType } from '../../../../ui/LibraryBrowser/model/user-managed-items';
import { getReadableItemType } from '../../../../ui/LibraryBrowser/get-readable-item-type';
import { managedItemTypeToPb } from '../../../../ui/LibraryBrowser/model/user-managed-items-conversions-pb';
import { resourceMatcherToPb } from '../../../../ui/LibraryBrowser/model/resource-matchers-conversions-pb';
import { Code } from '../../../../../grpc-web/google/rpc/code_pb';
import { itemCountPerTypeFromPb } from '../../../../ui/LibraryBrowser/item-count-per-type';
import NoData from '../../../../ui/NoData/NoData';
import FormLabel from '../../../../ui/ConfigurationTable/FormLabel/FormLabel';
import { help } from '../../../../ui/LibraryBrowser/LibraryBrowserPanel/help';
import BrowseLibraryButton from './BrowseLibraryItemButton/BrowseLibraryButton';

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
  "markdown-document"
];

const Library: React.FC<LibraryProps> = (props) => {
  const { notifyError } = Notifications.useContext();
  const { libraryServiceClient } = GrpcClient.useContext();
  const [itemCountPerType, setItemCountPerType] = useState<Partial<Record<ManagedItemType, number>>>({});

  useEffect(() => {
    async function fetchItemCount() {
      const req = new pb.GetLibraryItemsCountRequest();
      req.setTypesList(itemTypes.map(managedItemTypeToPb));

      const resourceMatcher = resourceMatcherFromContext(props.libraryContext);
      const resourceMatcherPb = resourceMatcherToPb(resourceMatcher);
      req.setContextsList([resourceMatcherPb]);

      const res = await libraryServiceClient.getLibraryItemsCount(req, null)
        .catch(err => notifyError(`Unable to fetch library items count. ${err}`));

      if (res === undefined) {
        return;
      }

      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to fetch library items count. ${res.getStatus()?.getMessage()}`);
      }

      const newItemCountPerType = itemCountPerTypeFromPb(res.getItemCountPerTypeList());
      setItemCountPerType(newItemCountPerType);

      const totalCount = Object.entries(newItemCountPerType).reduce((total, t) => total + t[1], 0);
      props.onCount(totalCount);
    }

    fetchItemCount();
  }, [props.libraryContext]);

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
                    <div>
                      <FormLabel
                        content={getReadableItemType(itemType)}
                        help={help[itemType]}
                      />
                    </div>
                    {itemCount === undefined ? <NoData /> : <strong>{itemCount}</strong>}

                    <div className={s.ItemHeaderButtons}>
                      <BrowseLibraryButton
                        itemType={itemType}
                        libraryContext={props.libraryContext}
                      />
                      <CreateLibraryItemButton
                        itemType={itemType}
                        libraryContext={props.libraryContext}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        }
      </div>
    </div >
  );
}

export default Library;
