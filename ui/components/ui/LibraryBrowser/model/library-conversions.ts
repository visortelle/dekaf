import * as pb from "../../../../grpc-web/tools/teal/pulsar/ui/library/v1/library_pb";
import * as t from "./library";
import { resourceMatcherFromPb, resourceMatcherToPb } from "./resource-matchers-conversions";
import { userManagedItemFromPb, userManagedItemToPb } from "./user-managed-items-conversions-pb";

export function libraryItemMetadataFromPb(v: pb.LibraryItemMetadata): t.LibraryItemMetadata {
  return {
    revision: v.getRevision(),
    updatedAt: v.getUpdatedAt(),
    tags: v.getTagsList(),
    availableForContexts: v.getAvailableForContextsList().map(resourceMatcherFromPb),
  };
}

export function libraryItemMetadataToPb(v: t.LibraryItemMetadata): pb.LibraryItemMetadata {
  const metadataPb = new pb.LibraryItemMetadata();
  metadataPb.setRevision(v.revision);
  metadataPb.setUpdatedAt(v.updatedAt);
  metadataPb.setTagsList(v.tags);
  metadataPb.setAvailableForContextsList(v.availableForContexts.map(resourceMatcherToPb));
  return metadataPb;
}

export function libraryItemFromPb(v: pb.LibraryItem): t.LibraryItem {
  return {
    metadata: libraryItemMetadataFromPb(v.getMetadata()!),
    spec: userManagedItemFromPb(v.getSpec()!)
  };
}

export function libraryItemToPb(v: t.LibraryItem): pb.LibraryItem {
  const itemPb = new pb.LibraryItem();
  itemPb.setMetadata(libraryItemMetadataToPb(v.metadata));
  itemPb.setSpec(userManagedItemToPb(v.spec));
  return itemPb;
}
