import { useEffect, useState } from "react";
import { ValueOrReference } from "./model/user-managed-items";
import * as pb from '../../../grpc-web/tools/teal/pulsar/ui/library/v1/library_pb';
import * as GrpcClient from '../../app/contexts/GrpcClient/GrpcClient';
import * as Notifications from '../../app/contexts/Notifications';
import { Code } from "../../../grpc-web/google/rpc/code_pb";
import { libraryItemFromPb } from "./model/library-conversions";
import NothingToShow from "../NothingToShow/NothingToShow";

export type UseResolveUserManagedItemValOrRefResult<ValueT> = {
  type: 'success',
  value: ValueT
} | {
  type: 'pending'
} | {
  type: 'failure',
  reason: string
};

export function useResolveUserManagedItemValOrRef<ValueT>(valOrRef: ValueOrReference<ValueT>): UseResolveUserManagedItemValOrRefResult<ValueT> {
  const { libraryServiceClient } = GrpcClient.useContext();
  const { notifyError } = Notifications.useContext();
  const [result, setResult] = useState<UseResolveUserManagedItemValOrRefResult<ValueT>>({ type: 'pending' });


  const fetchItem = async (itemId: string) => {
    const req = new pb.GetLibraryItemRequest();
    req.setId(itemId);

    const res = await libraryServiceClient.getLibraryItem(req, {});
    if (res.getStatus()?.getCode() !== Code.OK) {
      notifyError(`Failed to load library item: ${res.getStatus()?.getMessage()}`);
      return;
    }

    const itemPb = res.getItem()!;
    const item = libraryItemFromPb(itemPb);

    setResult({ type: 'success', value: item.spec as ValueT });
  };

  useEffect(() => {
    if (valOrRef.type === 'value') {
      setResult({ type: 'success', value: valOrRef.value });
      return;
    }

    if (valOrRef.type === 'reference') {
      fetchItem(valOrRef.reference);
      return;
    }
  }, [valOrRef]);

  return result;
}

export type UseUserManagedItemValOrRefSpinnerProps = {
  item: ValueOrReference<any>;
  result: UseResolveUserManagedItemValOrRefResult<any>;
};
export const UseUserManagedItemValOrRefSpinner: React.FC<UseUserManagedItemValOrRefSpinnerProps> = (props) => {
  if (props.result.type === 'failure') {
    return (
      <NothingToShow reason="error" content={(
        <div>
          Unable to fetch item with id: ${props.item.type === 'reference' ? props.item.reference : props.item.value.metadata.id}.
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
