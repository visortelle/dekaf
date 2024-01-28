import React, { useEffect, useState } from 'react';
import s from './LibraryBrowserPickButton.module.css'
import * as GrpcClient from '../../../../../app/contexts/GrpcClient/GrpcClient';
import * as pb from '../../../../../../grpc-web/tools/teal/pulsar/ui/library/v1/library_pb';
import * as Modals from '../../../../../app/contexts/Modals/Modals';
import * as Notifications from '../../../../../app/contexts/Notifications';
import { mkLibraryBrowserModal } from '../../../modals';
import pickIcon from './pick.svg';
import { ManagedItem, ManagedItemType } from '../../../model/user-managed-items';
import { LibraryContext, resourceMatcherFromContext } from '../../../model/library-context';
import { LibraryBrowserProps } from '../../../LibraryBrowser';
import { managedItemTypeToPb } from '../../../model/user-managed-items-conversions-pb';
import { resourceMatcherToPb } from '../../../model/resource-matchers-conversions-pb';
import { Code } from '../../../../../../grpc-web/google/rpc/code_pb';
import { tooltipId } from '../../../../Tooltip/Tooltip';
import SvgIcon from '../../../../SvgIcon/SvgIcon';

export type LibraryBrowserPickButtonProps = {
  itemType: ManagedItemType;
  onPick: (item: ManagedItem) => void;
  libraryContext: LibraryContext;
  libraryBrowser?: Partial<LibraryBrowserProps>
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

      const resourceMatcher = resourceMatcherFromContext(props.libraryContext);
      const resourceMatcherPb = resourceMatcherToPb(resourceMatcher);
      req.setContextsList([resourceMatcherPb]);

      const res = await libraryServiceClient.getLibraryItemsCount(req, null)
        .catch(err => notifyError(`Unable to fetch library item count: ${err}`));

      if (res === undefined) {
        return;
      }

      if (res.getStatus()?.getCode() !== Code.OK) {
        notifyError(`Unable to fetch library item count: ${res.getStatus()?.getMessage()}`);
        return;
      }

      setItemCount(res.getItemCountPerTypeList()[0]?.getItemCount());
    }

    fetchItemCount();
  }, [props.itemType]);

  return itemCount === undefined ?
    null : (
      <span
        className={s.ItemCount}
        onClick={() => {
          const modal = mkLibraryBrowserModal({
            libraryBrowserProps: {
              mode: {
                type: 'pick',
                itemType: props.itemType,
                onPick: (item) => {
                  props.onPick(item);
                },
              },
              onCancel: modals.pop,
              libraryContext: props.libraryContext,
              ...props.libraryBrowser
            }
          });

          modals.push(modal);
        }}
        data-tooltip-id={tooltipId}
        data-tooltip-html="Browse saved items"
      >
        {/* <div className={s.Icon}>
          <SvgIcon
            svg={pickIcon}
          />
        </div> */}
        <strong>{itemCount}&nbsp;found</strong>
      </span>
    );
}

export default LibraryBrowserPickButton;
