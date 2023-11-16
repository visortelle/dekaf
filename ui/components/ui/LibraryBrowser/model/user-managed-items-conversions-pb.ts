import * as pb from "../../../../grpc-web/tools/teal/pulsar/ui/library/v1/managed_items_pb";
import * as consumerPb from "../../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb";
import * as t from "./user-managed-items";
import {
  messageFilterFromPb,
  messageFilterToPb,
  messageFilterChainModeFromPb,
  messageFilterChainModeToPb,
  dateTimeUnitFromPb,
  dateTimeUnitToPb,
  namespacedRegexTopicSelectorFromPb,
  namespacedRegexTopicSelectorToPb
} from "../../../TopicPage/Messages/conversions";
import { Timestamp } from "google-protobuf/google/protobuf/timestamp_pb";
import { hexStringFromByteArray, hexStringToByteArray } from "../../../conversions/conversions";

export function managedItemTypeFromPb(v: pb.ManagedItemType): t.ManagedItemType {
  switch (v) {
    case pb.ManagedItemType.MANAGED_ITEM_TYPE_CONSUMER_SESSION_CONFIG: return "consumer-session-config";
    case pb.ManagedItemType.MANAGED_ITEM_TYPE_CONSUMER_SESSION_START_FROM: return "consumer-session-start-from";
    case pb.ManagedItemType.MANAGED_ITEM_TYPE_CONSUMER_SESSION_PAUSE_TRIGGER: return "consumer-session-pause-trigger";
    case pb.ManagedItemType.MANAGED_ITEM_TYPE_PRODUCER_SESSION_CONFIG: return "producer-session-config";
    case pb.ManagedItemType.MANAGED_ITEM_TYPE_MESSAGE_FILTER: return "message-filter";
    case pb.ManagedItemType.MANAGED_ITEM_TYPE_MESSAGE_FILTER_CHAIN: return "message-filter-chain";
    default: throw new Error(`Unknown ManagedItemType: ${v}`);
  }
}

export function managedItemTypeToPb(v: t.ManagedItemType): pb.ManagedItemType {
  switch (v) {
    case "consumer-session-config": return pb.ManagedItemType.MANAGED_ITEM_TYPE_CONSUMER_SESSION_CONFIG;
    case "consumer-session-start-from": return pb.ManagedItemType.MANAGED_ITEM_TYPE_CONSUMER_SESSION_START_FROM;
    case "consumer-session-pause-trigger": return pb.ManagedItemType.MANAGED_ITEM_TYPE_CONSUMER_SESSION_PAUSE_TRIGGER;
    case "producer-session-config": return pb.ManagedItemType.MANAGED_ITEM_TYPE_PRODUCER_SESSION_CONFIG;
    case "message-filter": return pb.ManagedItemType.MANAGED_ITEM_TYPE_MESSAGE_FILTER;
    case "message-filter-chain": return pb.ManagedItemType.MANAGED_ITEM_TYPE_MESSAGE_FILTER_CHAIN;
    default: throw new Error(`Unknown ManagedItemType: ${v}`);
  }
}

export function managedItemMetadataFromPb(v: pb.ManagedItemMetadata): t.ManagedItemMetadata {
  return {
    type: managedItemTypeFromPb(v.getType()),
    id: v.getId(),
    name: v.getName(),
    descriptionMarkdown: v.getDescriptionMarkdown(),
  };
}

export function managedItemMetadataToPb(v: t.ManagedItemMetadata): pb.ManagedItemMetadata {
  const metadataPb = new pb.ManagedItemMetadata();
  metadataPb.setType(managedItemTypeToPb(v.type));
  metadataPb.setId(v.id);
  metadataPb.setName(v.name);
  metadataPb.setDescriptionMarkdown(v.descriptionMarkdown);
  return metadataPb;
}

export function managedMessageIdSpecFromPb(v: pb.ManagedMessageIdSpec): t.ManagedMessageIdSpec {
  return { hexString: hexStringFromByteArray(v.getMessageId_asU8(), 'hex-with-space') };
}

export function managedMessageIdSpecToPb(v: t.ManagedMessageIdSpec): pb.ManagedMessageIdSpec {
  const specPb = new pb.ManagedMessageIdSpec();
  specPb.setMessageId(v.hexString);
  return specPb;
}

export function managedMessageIdFromPb(v: pb.ManagedMessageId): t.ManagedMessageId {
  return {
    metadata: managedItemMetadataFromPb(v.getMetadata()!),
    spec: managedMessageIdSpecFromPb(v.getSpec()!)
  };
}

export function managedMessageIdToPb(v: t.ManagedMessageId): pb.ManagedMessageId {
  const idPb = new pb.ManagedMessageId();
  idPb.setMetadata(managedItemMetadataToPb(v.metadata));
  idPb.setSpec(managedMessageIdSpecToPb(v.spec));
  return idPb;
}

export function managedMessageIdValOrRefFromPb(v: pb.ManagedMessageIdValOrRef): t.ManagedMessageIdValOrRef {
  switch (v.getMessageIdCase()) {
    case pb.ManagedMessageIdValOrRef.MessageIdCase.MESSAGE_ID_VALUE:
      return {
        type: 'value',
        val: managedMessageIdFromPb(v.getMessageIdValue()!)
      };
    case pb.ManagedMessageIdValOrRef.MessageIdCase.MESSAGE_ID_REFERENCE:
      return {
        type: 'reference',
        ref: v.getMessageIdReference()
      };
    default:
      throw new Error(`Unknown ManagedMessageIdValOrRef: ${v}`);
  }
}

export function managedMessageIdValOrRefToPb(v: t.ManagedMessageIdValOrRef): pb.ManagedMessageIdValOrRef {
  const idPb = new pb.ManagedMessageIdValOrRef();
  switch (v.type) {
    case 'value':
      idPb.setMessageIdValue(managedMessageIdToPb(v.val));
      break;
    case 'reference':
      idPb.setMessageIdReference(v.ref);
      break;
    default:
      throw new Error(`Unknown ManagedMessageIdValOrRef: ${v}`);
  }
  return idPb;
}

export function managedDateTimeSpecFromPb(v: pb.ManagedDateTimeSpec): t.ManagedDateTimeSpec {
  return { dateTime: v.getDateTime()!.toDate() };
}

export function managedDateTimeSpecToPb(v: t.ManagedDateTimeSpec): pb.ManagedDateTimeSpec {
  const specPb = new pb.ManagedDateTimeSpec();
  specPb.setDateTime(Timestamp.fromDate(v.dateTime));
  return specPb;
}

export function managedDateTimeFromPb(v: pb.ManagedDateTime): t.ManagedDateTime {
  return {
    metadata: managedItemMetadataFromPb(v.getMetadata()!),
    spec: managedDateTimeSpecFromPb(v.getSpec()!)
  };
}

export function managedDateTimeToPb(v: t.ManagedDateTime): pb.ManagedDateTime {
  const idPb = new pb.ManagedDateTime();
  idPb.setMetadata(managedItemMetadataToPb(v.metadata));
  idPb.setSpec(managedDateTimeSpecToPb(v.spec));
  return idPb;
}

export function managedDateTimeValOrRefFromPb(v: pb.ManagedDateTimeValOrRef): t.ManagedDateTimeValOrRef {
  switch (v.getDateTimeCase()) {
    case pb.ManagedDateTimeValOrRef.DateTimeCase.DATE_TIME_VALUE:
      return {
        type: 'value',
        val: managedDateTimeFromPb(v.getDateTimeValue()!)
      };
    case pb.ManagedDateTimeValOrRef.DateTimeCase.DATE_TIME_REFERENCE:
      return {
        type: 'reference',
        ref: v.getDateTimeReference()
      };
    default:
      throw new Error(`Unknown ManagedDateTimeValOrRef: ${v}`);
  }
}

export function managedDateTimeValOrRefToPb(v: t.ManagedDateTimeValOrRef): pb.ManagedDateTimeValOrRef {
  const idPb = new pb.ManagedDateTimeValOrRef();
  switch (v.type) {
    case 'value':
      idPb.setDateTimeValue(managedDateTimeToPb(v.val));
      break;
    case 'reference':
      idPb.setDateTimeReference(v.ref);
      break;
    default:
      throw new Error(`Unknown ManagedDateTimeValOrRef: ${v}`);
  }
  return idPb;
}

export function managedRelativeDateTimeSpecFromPb(v: pb.ManagedRelativeDateTimeSpec): t.ManagedRelativeDateTimeSpec {
  return {
    value: v.getValue(),
    unit: dateTimeUnitFromPb(v.getUnit()),
    isRoundedToUnitStart: v.getIsRoundedToUnitStart()
  };
}

export function managedRelativeDateTimeSpecToPb(v: t.ManagedRelativeDateTimeSpec): pb.ManagedRelativeDateTimeSpec {
  const specPb = new pb.ManagedRelativeDateTimeSpec();
  specPb.setValue(v.value);
  specPb.setUnit(dateTimeUnitToPb(v.unit));
  specPb.setIsRoundedToUnitStart(v.isRoundedToUnitStart);
  return specPb;
}

export function managedRelativeDateTimeFromPb(v: pb.ManagedRelativeDateTime): t.ManagedRelativeDateTime {
  return {
    metadata: managedItemMetadataFromPb(v.getMetadata()!),
    spec: managedRelativeDateTimeSpecFromPb(v.getSpec()!)
  };
}

export function managedRelativeDateTimeToPb(v: t.ManagedRelativeDateTime): pb.ManagedRelativeDateTime {
  const idPb = new pb.ManagedRelativeDateTime();
  idPb.setMetadata(managedItemMetadataToPb(v.metadata));
  idPb.setSpec(managedRelativeDateTimeSpecToPb(v.spec));
  return idPb;
}

export function managedRelativeDateTimeValOrRefFromPb(v: pb.ManagedRelativeDateTimeValOrRef): t.ManagedRelativeDateTimeValOrRef {
  switch (v.getRelativeDateTimeCase()) {
    case pb.ManagedRelativeDateTimeValOrRef.RelativeDateTimeCase.RELATIVE_DATE_TIME_VALUE:
      return {
        type: 'value',
        val: managedRelativeDateTimeFromPb(v.getRelativeDateTimeValue()!)
      };
    case pb.ManagedRelativeDateTimeValOrRef.RelativeDateTimeCase.RELATIVE_DATE_TIME_REFERENCE:
      return {
        type: 'reference',
        ref: v.getRelativeDateTimeReference()
      };
    default:
      throw new Error(`Unknown ManagedRelativeDateTimeValOrRef: ${v}`);
  }
}

export function managedRelativeDateTimeValOrRefToPb(v: t.ManagedRelativeDateTimeValOrRef): pb.ManagedRelativeDateTimeValOrRef {
  const idPb = new pb.ManagedRelativeDateTimeValOrRef();
  switch (v.type) {
    case 'value':
      idPb.setRelativeDateTimeValue(managedRelativeDateTimeToPb(v.val));
      break;
    case 'reference':
      idPb.setRelativeDateTimeReference(v.ref);
      break;
    default:
      throw new Error(`Unknown ManagedRelativeDateTimeValOrRef: ${v}`);
  }
  return idPb;
}

export function managedConsumerSessionStartFromSpecFromPb(v: pb.ManagedConsumerSessionStartFromSpec): t.ManagedConsumerSessionStartFromSpec {
  switch (v.getStartFromCase()) {
    case pb.ManagedConsumerSessionStartFromSpec.StartFromCase.START_FROM_EARLIEST_MESSAGE:
      return { startFrom: { type: 'earliestMessage' } };
    case pb.ManagedConsumerSessionStartFromSpec.StartFromCase.START_FROM_LATEST_MESSAGE:
      return { startFrom: { type: 'latestMessage' } };
    case pb.ManagedConsumerSessionStartFromSpec.StartFromCase.START_FROM_NTH_MESSAGE_AFTER_EARLIEST:
      return { startFrom: { type: 'nthMessageAfterEarliest', n: v.getStartFromNthMessageAfterEarliest()!.getN() } };
    case pb.ManagedConsumerSessionStartFromSpec.StartFromCase.START_FROM_NTH_MESSAGE_BEFORE_LATEST:
      return { startFrom: { type: 'nthMessageBeforeLatest', n: v.getStartFromNthMessageBeforeLatest()!.getN() } };
    case pb.ManagedConsumerSessionStartFromSpec.StartFromCase.START_FROM_MESSAGE_ID:
      return { startFrom: { type: 'messageId', messageId: managedMessageIdValOrRefFromPb(v.getStartFromMessageId()!) } };
    case pb.ManagedConsumerSessionStartFromSpec.StartFromCase.START_FROM_DATE_TIME:
      return { startFrom: { type: 'dateTime', dateTime: managedDateTimeValOrRefFromPb(v.getStartFromDateTime()!) } };
    case pb.ManagedConsumerSessionStartFromSpec.StartFromCase.START_FROM_RELATIVE_DATE_TIME:
      return { startFrom: { type: 'relativeDateTime', relativeDateTime: managedRelativeDateTimeValOrRefFromPb(v.getStartFromRelativeDateTime()!) } };
    default:
      throw new Error(`Unknown ManagedConsumerSessionStartFromSpec: ${v}`);
  }
}

export function managedConsumerSessionStartFromSpecToPb(v: t.ManagedConsumerSessionStartFromSpec): pb.ManagedConsumerSessionStartFromSpec {
  const specPb = new pb.ManagedConsumerSessionStartFromSpec();
  switch (v.startFrom.type) {
    case 'earliestMessage':
      specPb.setStartFromEarliestMessage(new consumerPb.EarliestMessage());
      break;
    case 'latestMessage':
      specPb.setStartFromLatestMessage(new consumerPb.LatestMessage());
      break;
    case 'nthMessageAfterEarliest':
      specPb.setStartFromNthMessageAfterEarliest(new consumerPb.NthMessageAfterEarliest().setN(v.startFrom.n));
      break;
    case 'nthMessageBeforeLatest':
      specPb.setStartFromNthMessageBeforeLatest(new consumerPb.NthMessageBeforeLatest().setN(v.startFrom.n));
      break;
    case 'messageId':
      specPb.setStartFromMessageId(managedMessageIdValOrRefToPb(v.startFrom.messageId));
      break;
    case 'dateTime':
      specPb.setStartFromDateTime(managedDateTimeValOrRefToPb(v.startFrom.dateTime));
      break;
    case 'relativeDateTime':
      specPb.setStartFromRelativeDateTime(managedRelativeDateTimeValOrRefToPb(v.startFrom.relativeDateTime));
      break;
    default:
      throw new Error(`Unknown ManagedConsumerSessionStartFromSpec: ${v}`);
  }
  return specPb;
}

export function managedConsumerSessionStartFromFromPb(v: pb.ManagedConsumerSessionStartFrom): t.ManagedConsumerSessionStartFrom {
  return {
    metadata: managedItemMetadataFromPb(v.getMetadata()!),
    spec: managedConsumerSessionStartFromSpecFromPb(v.getSpec()!)
  };
}

export function managedConsumerSessionStartFromToPb(v: t.ManagedConsumerSessionStartFrom): pb.ManagedConsumerSessionStartFrom {
  const idPb = new pb.ManagedConsumerSessionStartFrom();
  idPb.setMetadata(managedItemMetadataToPb(v.metadata));
  idPb.setSpec(managedConsumerSessionStartFromSpecToPb(v.spec));
  return idPb;
}

export function managedConsumerSessionStartFromValOrRefFromPb(v: pb.ManagedConsumerSessionStartFromValOrRef): t.ManagedConsumerSessionStartFromValOrRef {
  switch (v.getStartFromCase()) {
    case pb.ManagedConsumerSessionStartFromValOrRef.StartFromCase.START_FROM_VALUE:
      return {
        type: 'value',
        val: managedConsumerSessionStartFromFromPb(v.getStartFromValue()!)
      };
    case pb.ManagedConsumerSessionStartFromValOrRef.StartFromCase.START_FROM_REFERENCE:
      return {
        type: 'reference',
        ref: v.getStartFromReference()
      };
    default:
      throw new Error(`Unknown ManagedConsumerSessionStartFromValOrRef: ${v}`);
  }
}

export function managedConsumerSessionStartFromValOrRefToPb(v: t.ManagedConsumerSessionStartFromValOrRef): pb.ManagedConsumerSessionStartFromValOrRef {
  const idPb = new pb.ManagedConsumerSessionStartFromValOrRef();
  switch (v.type) {
    case 'value':
      idPb.setStartFromValue(managedConsumerSessionStartFromToPb(v.val));
      break;
    case 'reference':
      idPb.setStartFromReference(v.ref);
      break;
    default:
      throw new Error(`Unknown ManagedConsumerSessionStartFromValOrRef: ${v}`);
  }
  return idPb;
}

export function userMangedMessageFilterSpecFromPb(v: pb.ManagedMessageFilterSpec): t.ManagedMessageFilterSpec {
  return messageFilterFromPb(v.getMessageFilter()!)
}

export function userMangedMessageFilterSpecToPb(v: t.ManagedMessageFilterSpec): pb.ManagedMessageFilterSpec {
  const specPb = new pb.ManagedMessageFilterSpec();
  specPb.setMessageFilter(messageFilterToPb(v));
  return specPb;
}

export function managedMessageFilterFromPb(v: pb.ManagedMessageFilter): t.ManagedMessageFilter {
  return {
    metadata: managedItemMetadataFromPb(v.getMetadata()!),
    spec: userMangedMessageFilterSpecFromPb(v.getSpec()!)
  };
}

export function managedMessageFilterToPb(v: t.ManagedMessageFilter): pb.ManagedMessageFilter {
  const filterPb = new pb.ManagedMessageFilter();
  filterPb.setMetadata(managedItemMetadataToPb(v.metadata));
  filterPb.setSpec(userMangedMessageFilterSpecToPb(v.spec));
  return filterPb;
}

export function managedMessageFilterValOrRefFromPb(v: pb.ManagedMessageFilterValOrRef): t.ManagedMessageFilterValOrRef {
  switch (v.getMessageFilterCase()) {
    case pb.ManagedMessageFilterValOrRef.MessageFilterCase.MESSAGE_FILTER_VALUE:
      return {
        type: 'value',
        val: managedMessageFilterFromPb(v.getMessageFilterValue()!)
      };
    case pb.ManagedMessageFilterValOrRef.MessageFilterCase.MESSAGE_FILTER_REFERENCE:
      return {
        type: 'reference',
        ref: v.getMessageFilterReference()
      };
    default:
      throw new Error(`Unknown ManagedMessageFilterValOrRef: ${v}`);
  }
}

export function managedMessageFilterValOrRefToPb(v: t.ManagedMessageFilterValOrRef): pb.ManagedMessageFilterValOrRef {
  const filterPb = new pb.ManagedMessageFilterValOrRef();
  switch (v.type) {
    case 'value':
      filterPb.setMessageFilterValue(managedMessageFilterToPb(v.val));
      break;
    case 'reference':
      filterPb.setMessageFilterReference(v.ref);
      break;
    default:
      throw new Error(`Unknown ManagedMessageFilterValOrRef: ${v}`);
  }
  return filterPb;
}

export function managedMessageFilterChainSpecFromPb(v: pb.ManagedMessageFilterChainSpec): t.ManagedMessageFilterChainSpec {
  return {
    isEnabled: v.getIsEnabled(),
    isNegated: v.getIsNegated(),
    filters: v.getFiltersList().map(managedMessageFilterValOrRefFromPb),
    mode: messageFilterChainModeFromPb(v.getMode())
  };
}

export function managedMessageFilterChainSpecToPb(v: t.ManagedMessageFilterChainSpec): pb.ManagedMessageFilterChainSpec {
  const specPb = new pb.ManagedMessageFilterChainSpec();
  specPb.setIsEnabled(v.isEnabled);
  specPb.setIsNegated(v.isNegated);
  specPb.setFiltersList(v.filters.map(managedMessageFilterValOrRefToPb));
  specPb.setMode(messageFilterChainModeToPb(v.mode));
  return specPb;
}

export function managedMessageFilterChainFromPb(v: pb.ManagedMessageFilterChain): t.ManagedMessageFilterChain {
  return {
    metadata: managedItemMetadataFromPb(v.getMetadata()!),
    spec: managedMessageFilterChainSpecFromPb(v.getSpec()!)
  };
}

export function managedMessageFilterChainToPb(v: t.ManagedMessageFilterChain): pb.ManagedMessageFilterChain {
  const chainPb = new pb.ManagedMessageFilterChain();
  chainPb.setMetadata(managedItemMetadataToPb(v.metadata));
  chainPb.setSpec(managedMessageFilterChainSpecToPb(v.spec));
  return chainPb;
}

export function managedMessageFilterChainValOrRefFromPb(v: pb.ManagedMessageFilterChainValOrRef): t.ManagedMessageFilterChainValOrRef {
  switch (v.getMessageFilterChainCase()) {
    case pb.ManagedMessageFilterChainValOrRef.MessageFilterChainCase.MESSAGE_FILTER_CHAIN_VALUE:
      return {
        type: 'value',
        val: managedMessageFilterChainFromPb(v.getMessageFilterChainValue()!)
      };
    case pb.ManagedMessageFilterChainValOrRef.MessageFilterChainCase.MESSAGE_FILTER_CHAIN_REFERENCE:
      return {
        type: 'reference',
        ref: v.getMessageFilterChainReference()
      };
    default:
      throw new Error(`Unknown ManagedMessageFilterChainValOrRef: ${v}`);
  }
}

export function managedMessageFilterChainValOrRefToPb(v: t.ManagedMessageFilterChainValOrRef): pb.ManagedMessageFilterChainValOrRef {
  const chainPb = new pb.ManagedMessageFilterChainValOrRef();
  switch (v.type) {
    case 'value':
      chainPb.setMessageFilterChainValue(managedMessageFilterChainToPb(v.val));
      break;
    case 'reference':
      chainPb.setMessageFilterChainReference(v.ref);
      break;
    default:
      throw new Error(`Unknown ManagedMessageFilterChainValOrRef: ${v}`);
  }
  return chainPb;
}

export function topicsSelectorCurrentFromPb(v: pb.TopicsSelectorCurrentTopic): t.TopicsSelectorCurrentTopic {
  return { type: 'current-topic' };
}

export function topicsSelectorCurrentToPb(v: t.TopicsSelectorCurrentTopic): pb.TopicsSelectorCurrentTopic {
  return new pb.TopicsSelectorCurrentTopic();
}

export function topicsSelectorByFqnsFromPb(v: pb.TopicsSelectorByFqns): t.TopicsSelectorByFqns {
  return {
    type: 'by-fqns',
    topicFqns: v.getTopicFqnsList(),
    isConvertPartitionedTopicToItsPartitions: v.getIsConvertPartitionedTopicToItsPartitions()
  };
}

export function topicsSelectorByFqnsToPb(v: t.TopicsSelectorByFqns): pb.TopicsSelectorByFqns {
  const specPb = new pb.TopicsSelectorByFqns();
  specPb.setTopicFqnsList(v.topicFqns);
  specPb.setIsConvertPartitionedTopicToItsPartitions(v.isConvertPartitionedTopicToItsPartitions);
  return specPb;
}

export function managedTopicsSelectorSpecFromPb(v: pb.ManagedTopicsSelectorSpec): t.ManagedTopicSelectorSpec {
  switch (v.getTopicsSelectorCase()) {
    case pb.ManagedTopicsSelectorSpec.TopicsSelectorCase.TOPICS_SELECTOR_CURRENT_TOPIC:
      return { topicSelector: topicsSelectorCurrentFromPb(v.getTopicsSelectorCurrentTopic()!) };
    case pb.ManagedTopicsSelectorSpec.TopicsSelectorCase.TOPICS_SELECTOR_BY_FQNS:
      return { topicSelector: topicsSelectorByFqnsFromPb(v.getTopicsSelectorByFqns()!) };
    case pb.ManagedTopicsSelectorSpec.TopicsSelectorCase.TOPICS_SELECTOR_BY_REGEX:
      return { topicSelector: namespacedRegexTopicSelectorFromPb(v.getTopicsSelectorByRegex()!) };
    default:
      throw new Error(`Unknown ManagedTopicsSelectorSpec: ${v}`);
  }
}

export function managedTopicsSelectorSpecToPb(v: t.ManagedTopicSelectorSpec): pb.ManagedTopicsSelectorSpec {
  const specPb = new pb.ManagedTopicsSelectorSpec();
  switch (v.topicSelector.type) {
    case 'current-topic':
      specPb.setTopicsSelectorCurrentTopic(topicsSelectorCurrentToPb(v.topicSelector));
      break;
    case 'by-fqns':
      specPb.setTopicsSelectorByFqns(topicsSelectorByFqnsToPb(v.topicSelector));
      break;
    case 'by-regex':
      specPb.setTopicsSelectorByRegex(namespacedRegexTopicSelectorToPb(v.topicSelector));
      break;
    default:
      throw new Error(`Unknown ManagedTopicsSelectorSpec: ${v}`);
  }
  return specPb;
}

export function managedItemFromPb(v: pb.ManagedItem): t.ManagedItem {
  switch (v.getItemCase()) {
    case pb.ManagedItem.ItemCase.MESSAGE_FILTER:
      return managedMessageFilterFromPb(v.getMessageFilter()!);
    case pb.ManagedItem.ItemCase.MESSAGE_FILTER_CHAIN:
      return managedMessageFilterChainFromPb(v.getMessageFilterChain()!);
    case pb.ManagedItem.ItemCase.CONSUMER_SESSION_START_FROM:
      return managedConsumerSessionStartFromFromPb(v.getConsumerSessionStartFrom()!);
    default:
      throw new Error(`Unknown ManagedItem: ${v}`);
  }
}

export function managedItemToPb(v: t.ManagedItem): pb.ManagedItem {
  const itemPb = new pb.ManagedItem();
  switch (v.metadata.type) {
    case "message-filter": {
      itemPb.setSpecMessageFilter(managedMessageFilterToPb(v as t.ManagedMessageFilter));
      break;
    }
    case "message-filter-chain": {
      itemPb.setSpecMessageFilterChain(managedMessageFilterChainToPb(v as t.ManagedMessageFilterChain));
      break;
    }
    case "consumer-session-start-from": {
      itemPb.setSpecConsumerSessionStartFrom(managedConsumerSessionStartFromToPb(v as t.ManagedConsumerSessionStartFrom));
      break;
    }
  }
  return itemPb;
}
