import * as pb from '../../../grpc-web/tools/teal/pulsar/ui/library/v1/library_pb';
import { ManagedItemType } from './model/user-managed-items';
import { managedItemTypeFromPb } from './model/user-managed-items-conversions-pb';

export function itemCountPerTypeFromPb(v: pb.LibraryItemsCount[]): Record<ManagedItemType, number> {
  const pairs: [ManagedItemType, number][] = v.map(it => [
    managedItemTypeFromPb(it.getItemType()),
    it.getItemCount()
  ]);

  return Object.fromEntries(pairs) as Record<ManagedItemType, number>;
}
