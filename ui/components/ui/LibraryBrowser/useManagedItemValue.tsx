import { useEffect, useState } from "react";
import { ValOrRef } from "./model/user-managed-items";
import * as pb from '../../../grpc-web/tools/teal/pulsar/ui/library/v1/library_pb';
import * as GrpcClient from '../../app/contexts/GrpcClient/GrpcClient';
import * as Notifications from '../../app/contexts/Notifications';
import { Code } from "../../../grpc-web/google/rpc/code_pb";
import { libraryItemFromPb } from "./model/library-conversions";
import NothingToShow from "../NothingToShow/NothingToShow";
import SmallButton from "../SmallButton/SmallButton";

export type UseManagedItemValue<ValueT> = {
  type: 'success',
  value: ValueT
} | {
  type: 'pending'
} | {
  type: 'failure',
  reason?: string
};

export function useManagedItemValue<ValueT>(valOrRef: ValOrRef<ValueT>): UseManagedItemValue<ValueT> {
  const { libraryServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const [fetchedItem, setFetchedItem] = useState<UseManagedItemValue<ValueT>>({ type: 'pending' });

  const fetchItem = async (itemId: string) => {
    const req = new pb.GetLibraryItemRequest();
    req.setId(itemId);

    const res = await libraryServiceClient.getLibraryItem(req, {});
    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Unable to load library item with id: ${itemId}. ${res.getStatus()?.getMessage()}`);
      setFetchedItem({ type: 'failure', reason: res.getStatus()?.getMessage() });
      return;
    }

    const itemPb = res.getItem()!;
    const item = libraryItemFromPb(itemPb);

    setFetchedItem({ type: 'success', value: item.spec as ValueT });
  };

  useEffect(() => {
    if (valOrRef.type === 'reference' && valOrRef.val === undefined) {
      fetchItem(valOrRef.ref);
      return;
    }
  }, [valOrRef]);

  if (valOrRef.type === 'value') {
    return { type: 'success', value: valOrRef.val };
  }

  if (valOrRef.type == 'reference' && valOrRef.val !== undefined) {
    return { type: 'success', value: valOrRef.val };
  }

  return fetchedItem;
}

export type UseManagedItemValueSpinnerProps = {
  item: ValOrRef<any>;
  result: UseManagedItemValue<any>;
  onDelete?: () => void;
  onReset?: () => void;
};
export const UseManagedItemValueSpinner: React.FC<UseManagedItemValueSpinnerProps> = (props) => {
  if (props.result.type === 'failure') {
    return (
      <NothingToShow
        reason="error"
        content={(
          <div>
            Unable to fetch item with id: {props.item.type === 'reference' ? props.item.ref : props.item.val.metadata.id}.
            <br />
            Make sure that the item exists in the library.
            <br />
            {props.result.reason}
            {props.onDelete && (
              <div>
                <br />
                <SmallButton
                  text="Delete this item"
                  onClick={() => props.onDelete === undefined ? () => { } : props.onDelete()}
                  type="regular"
                />
              </div>
            )}
            {props.onReset && (
              <div>
                <br />
                <SmallButton
                  text="Reset to default"
                  onClick={() => props.onReset === undefined ? () => { } : props.onReset()}
                  type="regular"
                />
              </div>
            )}
          </div>
        )}
      />
    );
  }

  if (props.result.type === 'pending') {
    return (
      <NothingToShow reason="loading-in-progress" />
    );
  }

  return null;
};
