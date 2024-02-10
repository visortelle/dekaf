import React, { useEffect, useState } from 'react';
import s from './PickLibraryItemButton.module.css'
import * as GrpcClient from '../../../../../app/contexts/GrpcClient/GrpcClient';
import * as pb from '../../../../../../grpc-web/tools/teal/pulsar/ui/library/v1/library_pb';
import * as Modals from '../../../../../app/contexts/Modals/Modals';
import * as Notifications from '../../../../../app/contexts/Notifications';
import { ManagedItem, ManagedItemType } from '../../../model/user-managed-items';
import { LibraryContext } from '../../../model/library-context';
import { managedItemTypeToPb } from '../../../model/user-managed-items-conversions-pb';
import { resourceMatcherToPb } from '../../../model/resource-matchers-conversions-pb';
import { Code } from '../../../../../../grpc-web/google/rpc/code_pb';
import { tooltipId } from '../../../../Tooltip/Tooltip';
import BrowseDialog from '../../../dialogs/BrowseDialog/BrowseDialog';
import { ResourceMatcher } from '../../../model/resource-matchers';

export type LibraryBrowserPickButtonProps = {
  itemType: ManagedItemType;
  onPick: (item: ManagedItem) => void;
  libraryContext: LibraryContext;
  availableForContexts: ResourceMatcher[];
  onItemCount?: (count: number) => void;
  isHideSelectButton?: boolean
};

const LibraryBrowserPickButton: React.FC<LibraryBrowserPickButtonProps> = (props) => {
  const modals = Modals.useContext();
  const { notifyError } = Notifications.useContext();
  const { libraryServiceClient } = GrpcClient.useContext();
  const [itemCount, setItemCount] = useState<number | undefined>(undefined);

  useEffect(() => {
    async function fetchItemCount() {
      const req = new pb.GetLibraryItemsCountRequest();
      req.setTypesList([managedItemTypeToPb(props.itemType)]);

      const resourceMatchersPb = props.availableForContexts.map(resourceMatcherToPb);
      req.setContextsList(resourceMatchersPb);

      const res = await libraryServiceClient.getLibraryItemsCount(req, null)
        .catch(err => notifyError(`Unable to fetch library item count: ${err}`));

      if (res === undefined) {
        return;
      }

      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to fetch library item count: ${res.getStatus()?.getMessage()}`);
        return;
      }

      const newItemCount = res.getItemCountPerTypeList()[0]?.getItemCount();
      setItemCount(newItemCount);

      if (props.onItemCount !== undefined) {
        props.onItemCount(newItemCount);
      }
    }

    fetchItemCount();
  }, [props.itemType, props.availableForContexts]);

  return itemCount === undefined ?
    null : (
      <span
        className={s.ItemCount}
        onClick={() => {
          modals.push({
            id: `browse-library-${Date.now()}`,
            title: `Browse Library`,
            content: (
              <BrowseDialog
                itemType={props.itemType}
                onSelected={(libraryItem) => {
                  props.onPick(libraryItem.spec);
                }}
                onCanceled={modals.pop}
                libraryContext={props.libraryContext}
                isHideSelectButton={props.isHideSelectButton}
              />
            ),
            styleMode: 'no-content-padding'
          });
        }}
        data-tooltip-id={tooltipId}
        data-tooltip-html="Browse saved items"
      >
        <strong>{itemCount}&nbsp;found</strong>
      </span>
    );
}

export default LibraryBrowserPickButton;
