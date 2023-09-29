import { consumerSessionConfigToPb, messageFilterToPb, messageFilterChainToPb } from "../../TopicPage/Messages/conversions";
import * as pb from "../../../grpc-web/tools/teal/pulsar/ui/library/v1/library_pb";
import * as t from "./types";

export function libraryItemDescriptorToPb(descriptor: t.LibraryItemDescriptor): pb.LibraryItemDescriptor {
  switch (descriptor.type) {
    case 'consumer-session-config': {
      const descriptorPb = new pb.LibraryItemDescriptor();
      descriptorPb.setConsumerSessionConfig(consumerSessionConfigToPb(descriptor.value));
      return descriptorPb;
    }
    case 'message-filter': {
      const descriptorPb = new pb.LibraryItemDescriptor();
      descriptorPb.setMessageFilter(messageFilterToPb(descriptor.value));
      return descriptorPb;
    }
    case 'message-filter-chain': {
      const descriptorPb = new pb.LibraryItemDescriptor();
      descriptorPb.setMessageFilterChain(messageFilterChainToPb(descriptor.value));
      return descriptorPb;
    }
  }
}

export function libraryItemToPb(item: t.LibraryItem): pb.LibraryItem {
  const itemPb = new pb.LibraryItem();
  itemPb.setId(item.id);
  itemPb.setRevision(item.revision);
  itemPb.setUpdatedAt(item.updatedAt);
  itemPb.setIsEditable(item.isEditable);
  itemPb.setName(item.name);
  itemPb.setDescriptionMarkdown(item.descriptionMarkdown);
  itemPb.setTagsList(item.tags);

  // const resources = item.re.map(resourceMatcherToPb);
  // resources
  // descriptor
}
