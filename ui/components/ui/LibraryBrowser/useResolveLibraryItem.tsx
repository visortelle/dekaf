import { useEffect, useState } from "react";
import * as pb from '../../../grpc-web/tools/teal/pulsar/ui/library/v1/library_pb';
import * as GrpcClient from '../../app/contexts/GrpcClient/GrpcClient';
import * as Notifications from '../../app/contexts/Notifications';
import { Code } from "../../../grpc-web/google/rpc/code_pb";
import { libraryItemFromPb } from "./model/library-conversions";
import NothingToShow from "../NothingToShow/NothingToShow";
import { LibraryItem } from "./model/library";

export type UseResolveLibraryItemResult = {
  type: 'success',
  value: LibraryItem
} | {
  type: 'pending'
} | {
  type: 'failure',
  reason: string
} | {
  type: 'not-found'
} | {
  type: 'no-value-expected'
};

export function useResolveLibraryItem(itemId: string | undefined): UseResolveLibraryItemResult {
  const { libraryServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const [result, setResult] = useState<UseResolveLibraryItemResult>({ type: 'pending' });

  const fetchItem = async (itemId: string) => {
    const req = new pb.GetLibraryItemRequest();
    req.setId(itemId);

    const res = await libraryServiceClient.getLibraryItem(req, {});
    if (res.getStatus()?.getCode() === Code.NOT_FOUND) {
      setResult({ type: 'not-found' });
      return;
    }

    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Failed to load library item: ${res.getStatus()?.getMessage()}`);
      return;
    }

    const itemPb = res.getItem()!;
    const item = libraryItemFromPb(itemPb);

    setResult({ type: 'success', value: item });
  };

  useEffect(() => {
    if (itemId === undefined) {
      setResult({ type: 'no-value-expected' });
      return;
    }

    fetchItem(itemId);
  }, [itemId]);

  return result;
}

export type UseResolveLibraryItemSpinnerProps = {
  itemId: string;
  result: UseResolveLibraryItemResult;
};
export const UseResolveLibraryItemSpinner: React.FC<UseResolveLibraryItemSpinnerProps> = (props) => {
  if (props.result.type === 'failure') {
    return (
      <NothingToShow reason="error" content={(
        <div>
          Unable to fetch item with id: ${props.itemId}.
          <br />
          {props.result.reason}
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
