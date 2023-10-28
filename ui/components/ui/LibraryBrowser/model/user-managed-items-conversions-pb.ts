import * as pb from "../../../../grpc-web/tools/teal/pulsar/ui/library/v1/user_managed_items_pb";
import * as consumerPb from "../../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb";
import * as t from "./user-managed-items";
import {
  messageFilterFromPb,
  messageFilterToPb,
  messageFilterChainModeFromPb,
  messageFilterChainModeToPb,
  dateTimeUnitFromPb,
  dateTimeUnitToPb
} from "../../../TopicPage/Messages/conversions";
import { Timestamp } from "google-protobuf/google/protobuf/timestamp_pb";
import { hexStringFromByteArray, hexStringToByteArray } from "../../../conversions/conversions";

export function userManagedItemTypeFromPb(v: pb.UserManagedItemType): t.UserManagedItemType {
  switch (v) {
    case pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_CONSUMER_SESSION_CONFIG: return "consumer-session-config";
    case pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_CONSUMER_SESSION_START_FROM: return "consumer-session-start-from";
    case pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_CONSUMER_SESSION_PAUSE_TRIGGER: return "consumer-session-pause-trigger";
    case pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_PRODUCER_SESSION_CONFIG: return "producer-session-config";
    case pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_MESSAGE_FILTER: return "message-filter";
    case pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_MESSAGE_FILTER_CHAIN: return "message-filter-chain";
    default: throw new Error(`Unknown UserManagedItemType: ${v}`);
  }
}

export function userManagedItemTypeToPb(v: t.UserManagedItemType): pb.UserManagedItemType {
  switch (v) {
    case "consumer-session-config": return pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_CONSUMER_SESSION_CONFIG;
    case "consumer-session-start-from": return pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_CONSUMER_SESSION_START_FROM;
    case "consumer-session-pause-trigger": return pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_CONSUMER_SESSION_PAUSE_TRIGGER;
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

export function userManagedMessageIdSpecFromPb(v: pb.UserManagedMessageIdSpec): t.UserManagedMessageIdSpec {
  return { hexString: hexStringFromByteArray(v.getMessageId_asU8(), 'hex-with-space') };
}

export function userManagedMessageIdSpecToPb(v: t.UserManagedMessageIdSpec): pb.UserManagedMessageIdSpec {
  const specPb = new pb.UserManagedMessageIdSpec();
  specPb.setMessageId(v.hexString);
  return specPb;
}

export function userManagedMessageIdFromPb(v: pb.UserManagedMessageId): t.UserManagedMessageId {
  return {
    metadata: userManagedItemMetadataFromPb(v.getMetadata()!),
    spec: userManagedMessageIdSpecFromPb(v.getSpec()!)
  };
}

export function userManagedMessageIdToPb(v: t.UserManagedMessageId): pb.UserManagedMessageId {
  const idPb = new pb.UserManagedMessageId();
  idPb.setMetadata(userManagedItemMetadataToPb(v.metadata));
  idPb.setSpec(userManagedMessageIdSpecToPb(v.spec));
  return idPb;
}

export function userManagedMessageIdValueOrReferenceFromPb(v: pb.UserManagedMessageIdValueOrReference): t.UserManagedMessageIdValueOrReference {
  switch (v.getMessageIdCase()) {
    case pb.UserManagedMessageIdValueOrReference.MessageIdCase.MESSAGE_ID_VALUE:
      return {
        type: 'value',
        value: userManagedMessageIdFromPb(v.getMessageIdValue()!)
      };
    case pb.UserManagedMessageIdValueOrReference.MessageIdCase.MESSAGE_ID_REFERENCE:
      return {
        type: 'reference',
        reference: v.getMessageIdReference()
      };
    default:
      throw new Error(`Unknown UserManagedMessageIdValueOrReference: ${v}`);
  }
}

export function userManagedMessageIdValueOrReferenceToPb(v: t.UserManagedMessageIdValueOrReference): pb.UserManagedMessageIdValueOrReference {
  const idPb = new pb.UserManagedMessageIdValueOrReference();
  switch (v.type) {
    case 'value':
      idPb.setMessageIdValue(userManagedMessageIdToPb(v.value));
      break;
    case 'reference':
      idPb.setMessageIdReference(v.reference);
      break;
    default:
      throw new Error(`Unknown UserManagedMessageIdValueOrReference: ${v}`);
  }
  return idPb;
}

export function userManagedDateTimeSpecFromPb(v: pb.UserManagedDateTimeSpec): t.UserManagedDateTimeSpec {
  return { dateTime: v.getDateTime()!.toDate() };
}

export function userManagedDateTimeSpecToPb(v: t.UserManagedDateTimeSpec): pb.UserManagedDateTimeSpec {
  const specPb = new pb.UserManagedDateTimeSpec();
  specPb.setDateTime(Timestamp.fromDate(v.dateTime));
  return specPb;
}

export function userManagedDateTimeFromPb(v: pb.UserManagedDateTime): t.UserManagedDateTime {
  return {
    metadata: userManagedItemMetadataFromPb(v.getMetadata()!),
    spec: userManagedDateTimeSpecFromPb(v.getSpec()!)
  };
}

export function userManagedDateTimeToPb(v: t.UserManagedDateTime): pb.UserManagedDateTime {
  const idPb = new pb.UserManagedDateTime();
  idPb.setMetadata(userManagedItemMetadataToPb(v.metadata));
  idPb.setSpec(userManagedDateTimeSpecToPb(v.spec));
  return idPb;
}

export function userManagedDateTimeValueOrReferenceFromPb(v: pb.UserManagedDateTimeValueOrReference): t.UserManagedDateTimeValueOrReference {
  switch (v.getDateTimeCase()) {
    case pb.UserManagedDateTimeValueOrReference.DateTimeCase.DATE_TIME_VALUE:
      return {
        type: 'value',
        value: userManagedDateTimeFromPb(v.getDateTimeValue()!)
      };
    case pb.UserManagedDateTimeValueOrReference.DateTimeCase.DATE_TIME_REFERENCE:
      return {
        type: 'reference',
        reference: v.getDateTimeReference()
      };
    default:
      throw new Error(`Unknown UserManagedDateTimeValueOrReference: ${v}`);
  }
}

export function userManagedDateTimeValueOrReferenceToPb(v: t.UserManagedDateTimeValueOrReference): pb.UserManagedDateTimeValueOrReference {
  const idPb = new pb.UserManagedDateTimeValueOrReference();
  switch (v.type) {
    case 'value':
      idPb.setDateTimeValue(userManagedDateTimeToPb(v.value));
      break;
    case 'reference':
      idPb.setDateTimeReference(v.reference);
      break;
    default:
      throw new Error(`Unknown UserManagedDateTimeValueOrReference: ${v}`);
  }
  return idPb;
}

export function userManagedRelativeDateTimeSpecFromPb(v: pb.UserManagedRelativeDateTimeSpec): t.UserManagedRelativeDateTimeSpec {
  return {
    value: v.getValue(),
    unit: dateTimeUnitFromPb(v.getUnit()),
    isRoundedToUnitStart: v.getIsRoundedToUnitStart()
  };
}

export function userManagedRelativeDateTimeSpecToPb(v: t.UserManagedRelativeDateTimeSpec): pb.UserManagedRelativeDateTimeSpec {
  const specPb = new pb.UserManagedRelativeDateTimeSpec();
  specPb.setValue(v.value);
  specPb.setUnit(dateTimeUnitToPb(v.unit));
  specPb.setIsRoundedToUnitStart(v.isRoundedToUnitStart);
  return specPb;
}

export function userManagedRelativeDateTimeFromPb(v: pb.UserManagedRelativeDateTime): t.UserManagedRelativeDateTime {
  return {
    metadata: userManagedItemMetadataFromPb(v.getMetadata()!),
    spec: userManagedRelativeDateTimeSpecFromPb(v.getSpec()!)
  };
}

export function userManagedRelativeDateTimeToPb(v: t.UserManagedRelativeDateTime): pb.UserManagedRelativeDateTime {
  const idPb = new pb.UserManagedRelativeDateTime();
  idPb.setMetadata(userManagedItemMetadataToPb(v.metadata));
  idPb.setSpec(userManagedRelativeDateTimeSpecToPb(v.spec));
  return idPb;
}

export function userManagedRelativeDateTimeValueOrReferenceFromPb(v: pb.UserManagedRelativeDateTimeValueOrReference): t.UserManagedRelativeDateTimeValueOrReference {
  switch (v.getRelativeDateTimeCase()) {
    case pb.UserManagedRelativeDateTimeValueOrReference.RelativeDateTimeCase.RELATIVE_DATE_TIME_VALUE:
      return {
        type: 'value',
        value: userManagedRelativeDateTimeFromPb(v.getRelativeDateTimeValue()!)
      };
    case pb.UserManagedRelativeDateTimeValueOrReference.RelativeDateTimeCase.RELATIVE_DATE_TIME_REFERENCE:
      return {
        type: 'reference',
        reference: v.getRelativeDateTimeReference()
      };
    default:
      throw new Error(`Unknown UserManagedRelativeDateTimeValueOrReference: ${v}`);
  }
}

export function userManagedRelativeDateTimeValueOrReferenceToPb(v: t.UserManagedRelativeDateTimeValueOrReference): pb.UserManagedRelativeDateTimeValueOrReference {
  const idPb = new pb.UserManagedRelativeDateTimeValueOrReference();
  switch (v.type) {
    case 'value':
      idPb.setRelativeDateTimeValue(userManagedRelativeDateTimeToPb(v.value));
      break;
    case 'reference':
      idPb.setRelativeDateTimeReference(v.reference);
      break;
    default:
      throw new Error(`Unknown UserManagedRelativeDateTimeValueOrReference: ${v}`);
  }
  return idPb;
}

export function userManagedConsumerSessionStartFromSpecFromPb(v: pb.UserManagedConsumerSessionStartFromSpec): t.UserManagedConsumerSessionStartFromSpec {
  switch (v.getStartFromCase()) {
    case pb.UserManagedConsumerSessionStartFromSpec.StartFromCase.START_FROM_EARLIEST_MESSAGE:
      return { startFrom: { type: 'earliestMessage' } };
    case pb.UserManagedConsumerSessionStartFromSpec.StartFromCase.START_FROM_LATEST_MESSAGE:
      return { startFrom: { type: 'latestMessage' } };
    case pb.UserManagedConsumerSessionStartFromSpec.StartFromCase.START_FROM_N_MESSAGES_AFTER_EARLIEST:
      return { startFrom: { type: 'nMessagesAfterEarliest', n: v.getStartFromNMessagesAfterEarliest()!.getN() } };
    case pb.UserManagedConsumerSessionStartFromSpec.StartFromCase.START_FROM_N_MESSAGES_BEFORE_LATEST:
      return { startFrom: { type: 'nMessagesBeforeLatest', n: v.getStartFromNMessagesBeforeLatest()!.getN() } };
    case pb.UserManagedConsumerSessionStartFromSpec.StartFromCase.START_FROM_MESSAGE_ID:
      return { startFrom: { type: 'messageId', messageId: userManagedMessageIdValueOrReferenceFromPb(v.getStartFromMessageId()!) } };
    case pb.UserManagedConsumerSessionStartFromSpec.StartFromCase.START_FROM_DATE_TIME:
      return { startFrom: { type: 'dateTime', dateTime: userManagedDateTimeValueOrReferenceFromPb(v.getStartFromDateTime()!) } };
    case pb.UserManagedConsumerSessionStartFromSpec.StartFromCase.START_FROM_RELATIVE_DATE_TIME:
      return { startFrom: { type: 'relativeDateTime', relativeDateTime: userManagedRelativeDateTimeValueOrReferenceFromPb(v.getStartFromRelativeDateTime()!) } };
    default:
      throw new Error(`Unknown UserManagedConsumerSessionStartFromSpec: ${v}`);
  }
}

export function userManagedConsumerSessionStartFromSpecToPb(v: t.UserManagedConsumerSessionStartFromSpec): pb.UserManagedConsumerSessionStartFromSpec {
  const specPb = new pb.UserManagedConsumerSessionStartFromSpec();
  switch (v.startFrom.type) {
    case 'earliestMessage':
      specPb.setStartFromEarliestMessage(new consumerPb.EarliestMessage());
      break;
    case 'latestMessage':
      specPb.setStartFromLatestMessage(new consumerPb.LatestMessage());
      break;
    case 'nMessagesAfterEarliest':
      specPb.setStartFromNMessagesAfterEarliest(new consumerPb.NMessagesAfterEarliest().setN(v.startFrom.n));
      break;
    case 'nMessagesBeforeLatest':
      specPb.setStartFromNMessagesBeforeLatest(new consumerPb.NMessagesBeforeLatest().setN(v.startFrom.n));
      break;
    case 'messageId':
      specPb.setStartFromMessageId(userManagedMessageIdValueOrReferenceToPb(v.startFrom.messageId));
      break;
    case 'dateTime':
      specPb.setStartFromDateTime(userManagedDateTimeValueOrReferenceToPb(v.startFrom.dateTime));
      break;
    case 'relativeDateTime':
      specPb.setStartFromRelativeDateTime(userManagedRelativeDateTimeValueOrReferenceToPb(v.startFrom.relativeDateTime));
      break;
    default:
      throw new Error(`Unknown UserManagedConsumerSessionStartFromSpec: ${v}`);
  }
  return specPb;
}

export function userManagedConsumerSessionStartFromFromPb(v: pb.UserManagedConsumerSessionStartFrom): t.UserManagedConsumerSessionStartFrom {
  return {
    metadata: userManagedItemMetadataFromPb(v.getMetadata()!),
    spec: userManagedConsumerSessionStartFromSpecFromPb(v.getSpec()!)
  };
}

export function userManagedConsumerSessionStartFromToPb(v: t.UserManagedConsumerSessionStartFrom): pb.UserManagedConsumerSessionStartFrom {
  const idPb = new pb.UserManagedConsumerSessionStartFrom();
  idPb.setMetadata(userManagedItemMetadataToPb(v.metadata));
  idPb.setSpec(userManagedConsumerSessionStartFromSpecToPb(v.spec));
  return idPb;
}

export function userManagedConsumerSessionStartFromValueOrReferenceFromPb(v: pb.UserManagedConsumerSessionStartFromValueOrReference): t.UserManagedConsumerSessionStartFromValueOrReference {
  switch (v.getStartFromCase()) {
    case pb.UserManagedConsumerSessionStartFromValueOrReference.StartFromCase.START_FROM_VALUE:
      return {
        type: 'value',
        value: userManagedConsumerSessionStartFromFromPb(v.getStartFromValue()!)
      };
    case pb.UserManagedConsumerSessionStartFromValueOrReference.StartFromCase.START_FROM_REFERENCE:
      return {
        type: 'reference',
        reference: v.getStartFromReference()
      };
    default:
      throw new Error(`Unknown UserManagedConsumerSessionStartFromValueOrReference: ${v}`);
  }
}

export function userManagedConsumerSessionStartFromValueOrReferenceToPb(v: t.UserManagedConsumerSessionStartFromValueOrReference): pb.UserManagedConsumerSessionStartFromValueOrReference {
  const idPb = new pb.UserManagedConsumerSessionStartFromValueOrReference();
  switch (v.type) {
    case 'value':
      idPb.setStartFromValue(userManagedConsumerSessionStartFromToPb(v.value));
      break;
    case 'reference':
      idPb.setStartFromReference(v.reference);
      break;
    default:
      throw new Error(`Unknown UserManagedConsumerSessionStartFromValueOrReference: ${v}`);
  }
  return idPb;
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
    case pb.UserManagedItem.ItemCase.CONSUMER_SESSION_START_FROM:
      return userManagedConsumerSessionStartFromFromPb(v.getConsumerSessionStartFrom()!);
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
    case "consumer-session-start-from": {
      itemPb.setConsumerSessionStartFrom(userManagedConsumerSessionStartFromToPb(v as t.UserManagedConsumerSessionStartFrom));
      break;
    }
  }
  return itemPb;
}
