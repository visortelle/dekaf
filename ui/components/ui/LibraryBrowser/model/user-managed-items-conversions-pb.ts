import * as pb from "../../../../grpc-web/tools/teal/pulsar/ui/library/v1/user_managed_items_pb";
import * as t from "./user-managed-items";
import {
  messageFilterFromPb,
  messageFilterToPb,
  messageFilterChainModeFromPb,
  messageFilterChainModeToPb
} from "../../../TopicPage/Messages/conversions";

export function userManagedItemTypeFromPb(v: pb.UserManagedItemType): t.UserManagedItemType {
  switch (v) {
    case pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_CONSUMER_SESSION_CONFIG: return "consumer-session-config";
    case pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_CONSUMER_SESSION_CONFIG_START_FROM: return "consumer-session-config-start-from";
    case pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_CONSUMER_SESSION_CONFIG_PAUSE_TRIGGER: return "consumer-session-config-pause-trigger";
    case pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_PRODUCER_SESSION_CONFIG: return "producer-session-config";
    case pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_MESSAGE_FILTER: return "message-filter";
    case pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_MESSAGE_FILTER_CHAIN: return "message-filter-chain";
    default: throw new Error(`Unknown UserManagedItemType: ${v}`);
  }
}

export function userManagedItemTypeToPb(v: t.UserManagedItemType): pb.UserManagedItemType {
  switch (v) {
    case "consumer-session-config": return pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_CONSUMER_SESSION_CONFIG;
    case "consumer-session-config-start-from": return pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_CONSUMER_SESSION_CONFIG_START_FROM;
    case "consumer-session-config-pause-trigger": return pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_CONSUMER_SESSION_CONFIG_PAUSE_TRIGGER;
    case "producer-session-config": return pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_PRODUCER_SESSION_CONFIG;
    case "message-filter": return pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_MESSAGE_FILTER;
    case "message-filter-chain": return pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_MESSAGE_FILTER_CHAIN;
    default: throw new Error(`Unknown UserManagedItemType: ${v}`);
  }
}

export function userManagedItemMetadataFromPb(v: pb.UserManagedItemMetadata): t.UserManagedItemMetadata {
  return {
    type: userManagedItemTypeFromPb(v.getType()),
    id: v.getId(),
    name: v.getName(),
    descriptionMarkdown: v.getDescriptionMarkdown(),
  };
}

export function userManagedItemMetadataToPb(v: t.UserManagedItemMetadata): pb.UserManagedItemMetadata {
  const metadataPb = new pb.UserManagedItemMetadata();
  metadataPb.setType(userManagedItemTypeToPb(v.type));
  metadataPb.setId(v.id);
  metadataPb.setName(v.name);
  metadataPb.setDescriptionMarkdown(v.descriptionMarkdown);
  return metadataPb;
}

export function userMangedMessageFilterSpecFromPb(v: pb.UserManagedMessageFilterSpec): t.UserManagedMessageFilterSpec {
  return messageFilterFromPb(v.getMessageFilter()!)
}

export function userMangedMessageFilterSpecToPb(v: t.UserManagedMessageFilterSpec): pb.UserManagedMessageFilterSpec {
  const specPb = new pb.UserManagedMessageFilterSpec();
  specPb.setMessageFilter(messageFilterToPb(v));
  return specPb;
}

export function userManagedMessageFilterFromPb(v: pb.UserManagedMessageFilter): t.UserManagedMessageFilter {
  return {
    metadata: userManagedItemMetadataFromPb(v.getMetadata()!),
    spec: userMangedMessageFilterSpecFromPb(v.getSpec()!)
  };
}

export function userManagedMessageFilterToPb(v: t.UserManagedMessageFilter): pb.UserManagedMessageFilter {
  const filterPb = new pb.UserManagedMessageFilter();
  filterPb.setMetadata(userManagedItemMetadataToPb(v.metadata));
  filterPb.setSpec(userMangedMessageFilterSpecToPb(v.spec));
  return filterPb;
}

export function userManagedMessageFilterValueOrReferenceFromPb(v: pb.UserManagedMessageFilterValueOrReference): t.UserManagedMessageFilterValueOrReference {
  switch (v.getMessageFilterCase()) {
    case pb.UserManagedMessageFilterValueOrReference.MessageFilterCase.MESSAGE_FILTER_VALUE:
      return {
        type: 'value',
        value: userManagedMessageFilterFromPb(v.getMessageFilterValue()!)
      };
    case pb.UserManagedMessageFilterValueOrReference.MessageFilterCase.MESSAGE_FILTER_REFERENCE:
      return {
        type: 'reference',
        reference: v.getMessageFilterReference()
      };
    default:
      throw new Error(`Unknown UserManagedMessageFilterValueOrReference: ${v}`);
  }
}

export function userManagedMessageFilterValueOrReferenceToPb(v: t.UserManagedMessageFilterValueOrReference): pb.UserManagedMessageFilterValueOrReference {
  const filterPb = new pb.UserManagedMessageFilterValueOrReference();
  switch (v.type) {
    case 'value':
      filterPb.setMessageFilterValue(userManagedMessageFilterToPb(v.value));
      break;
    case 'reference':
      filterPb.setMessageFilterReference(v.reference);
      break;
    default:
      throw new Error(`Unknown UserManagedMessageFilterValueOrReference: ${v}`);
  }
  return filterPb;
}

export function userManagedMessageFilterChainSpecFromPb(v: pb.UserManagedMessageFilterChainSpec): t.UserManagedMessageFilterChainSpec {
  return {
    isEnabled: v.getIsEnabled(),
    isNegated: v.getIsNegated(),
    filters: v.getFiltersList().map(userManagedMessageFilterValueOrReferenceFromPb),
    mode: messageFilterChainModeFromPb(v.getMode())
  };
}

export function userManagedMessageFilterChainSpecToPb(v: t.UserManagedMessageFilterChainSpec): pb.UserManagedMessageFilterChainSpec {
  const specPb = new pb.UserManagedMessageFilterChainSpec();
  specPb.setIsEnabled(v.isEnabled);
  specPb.setIsNegated(v.isNegated);
  specPb.setFiltersList(v.filters.map(userManagedMessageFilterValueOrReferenceToPb));
  specPb.setMode(messageFilterChainModeToPb(v.mode));
  return specPb;
}

export function userManagedMessageFilterChainFromPb(v: pb.UserManagedMessageFilterChain): t.UserManagedMessageFilterChain {
  return {
    metadata: userManagedItemMetadataFromPb(v.getMetadata()!),
    spec: userManagedMessageFilterChainSpecFromPb(v.getSpec()!)
  };
}

export function userManagedMessageFilterChainToPb(v: t.UserManagedMessageFilterChain): pb.UserManagedMessageFilterChain {
  const chainPb = new pb.UserManagedMessageFilterChain();
  chainPb.setMetadata(userManagedItemMetadataToPb(v.metadata));
  chainPb.setSpec(userManagedMessageFilterChainSpecToPb(v.spec));
  return chainPb;
}

export function userManagedMessageFilterChainValueOrReferenceFromPb(v: pb.UserManagedMessageFilterChainValueOrReference): t.UserManagedMessageFilterChainValueOrReference {
  switch (v.getMessageFilterChainCase()) {
    case pb.UserManagedMessageFilterChainValueOrReference.MessageFilterChainCase.MESSAGE_FILTER_CHAIN_VALUE:
      return {
        type: 'value',
        value: userManagedMessageFilterChainFromPb(v.getMessageFilterChainValue()!)
      };
    case pb.UserManagedMessageFilterChainValueOrReference.MessageFilterChainCase.MESSAGE_FILTER_CHAIN_REFERENCE:
      return {
        type: 'reference',
        reference: v.getMessageFilterChainReference()
      };
    default:
      throw new Error(`Unknown UserManagedMessageFilterChainValueOrReference: ${v}`);
  }
}

export function userManagedMessageFilterChainValueOrReferenceToPb(v: t.UserManagedMessageFilterChainValueOrReference): pb.UserManagedMessageFilterChainValueOrReference {
  const chainPb = new pb.UserManagedMessageFilterChainValueOrReference();
  switch (v.type) {
    case 'value':
      chainPb.setMessageFilterChainValue(userManagedMessageFilterChainToPb(v.value));
      break;
    case 'reference':
      chainPb.setMessageFilterChainReference(v.reference);
      break;
    default:
      throw new Error(`Unknown UserManagedMessageFilterChainValueOrReference: ${v}`);
  }
  return chainPb;
}


export function userManagedItemFromPb(v: pb.UserManagedItem): t.UserManagedItem {
  switch (v.getItemCase()) {
    case pb.UserManagedItem.ItemCase.MESSAGE_FILTER:
      return userManagedMessageFilterFromPb(v.getMessageFilter()!);
    case pb.UserManagedItem.ItemCase.MESSAGE_FILTER_CHAIN:
      return userManagedMessageFilterChainFromPb(v.getMessageFilterChain()!);
    default:
      throw new Error(`Unknown UserManagedItem: ${v}`);
  }
}

export function userManagedItemToPb(v: t.UserManagedItem): pb.UserManagedItem {
  const itemPb = new pb.UserManagedItem();
  switch (v.metadata.type) {
    case "message-filter": {
      itemPb.setMessageFilter(userManagedMessageFilterToPb(v as t.UserManagedMessageFilter));
      break;
    }
    case "message-filter-chain": {
      itemPb.setMessageFilterChain(userManagedMessageFilterChainToPb(v as t.UserManagedMessageFilterChain));
      break;
    }
    default:
      throw new Error(`Unknown UserManagedItem: ${v}`);
  }
  return itemPb;
}
