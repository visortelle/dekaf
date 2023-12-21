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
  namespacedRegexTopicSelectorToPb,
  multiTopicSelectorFromPb,
  multiTopicSelectorToPb,
  consumerSessionEventMessagesProcessedFromPb,
  consumerSessionEventMessagesDeliveredFromPb,
  consumerSessionEventBytesProcessedFromPb,
  consumerSessionEventBytesDeliveredFromPb,
  consumerSessionEventMessageDecodeFailedFromPb,
  consumerSessionEventTimeElapsedFromPb,
  consumerSessionEventTopicEndReachedFromPb,
  consumerSessionEventUnexpectedErrorOccurredFromPb,
  consumerSessionEventMessagesProcessedToPb,
  consumerSessionEventMessagesDeliveredToPb,
  consumerSessionEventBytesProcessedToPb,
  consumerSessionEventBytesDeliveredToPb,
  consumerSessionEventMessageDecodeFailedToPb,
  consumerSessionEventTimeElapsedToPb,
  consumerSessionEventTopicEndReachedToPb,
  consumerSessionEventUnexpectedErrorOccurredToPb,
  consumerSessionPauseTriggerChainModeFromPb,
  consumerSessionPauseTriggerChainModeToPb,
} from "../../../TopicPage/Messages/conversions/conversions";
import { Timestamp } from "google-protobuf/google/protobuf/timestamp_pb";
import { hexStringFromByteArray, hexStringToByteArray } from "../../../conversions/conversions";

export function managedItemTypeFromPb(v: pb.ManagedItemType): t.ManagedItemType {
  switch (v) {
    case pb.ManagedItemType.MANAGED_ITEM_TYPE_CONSUMER_SESSION_CONFIG: return "consumer-session-config";
    case pb.ManagedItemType.MANAGED_ITEM_TYPE_CONSUMER_SESSION_TARGET: return "consumer-session-target";
    case pb.ManagedItemType.MANAGED_ITEM_TYPE_TOPIC_SELECTOR: return "topic-selector";
    case pb.ManagedItemType.MANAGED_ITEM_TYPE_CONSUMER_SESSION_START_FROM: return "consumer-session-start-from";
    case pb.ManagedItemType.MANAGED_ITEM_TYPE_CONSUMER_SESSION_PAUSE_TRIGGER_CHAIN: return "consumer-session-pause-trigger-chain";
    case pb.ManagedItemType.MANAGED_ITEM_TYPE_PRODUCER_SESSION_CONFIG: return "producer-session-config";
    case pb.ManagedItemType.MANAGED_ITEM_TYPE_MESSAGE_FILTER: return "message-filter";
    case pb.ManagedItemType.MANAGED_ITEM_TYPE_MESSAGE_FILTER_CHAIN: return "message-filter-chain";
    case pb.ManagedItemType.MANAGED_ITEM_TYPE_COLORING_RULE: return "coloring-rule";
    case pb.ManagedItemType.MANAGED_ITEM_TYPE_COLORING_RULE_CHAIN: return "coloring-rule-chain";
    case pb.ManagedItemType.MANAGED_ITEM_TYPE_MARKDOWN_DOCUMENT: return "markdown-document";
    default: throw new Error(`Unknown ManagedItemType: ${v}`);
  }
}

export function managedItemTypeToPb(v: t.ManagedItemType): pb.ManagedItemType {
  switch (v) {
    case "consumer-session-config": return pb.ManagedItemType.MANAGED_ITEM_TYPE_CONSUMER_SESSION_CONFIG;
    case "consumer-session-target": return pb.ManagedItemType.MANAGED_ITEM_TYPE_CONSUMER_SESSION_TARGET;
    case "topic-selector": return pb.ManagedItemType.MANAGED_ITEM_TYPE_TOPIC_SELECTOR;
    case "consumer-session-start-from": return pb.ManagedItemType.MANAGED_ITEM_TYPE_CONSUMER_SESSION_START_FROM;
    case "consumer-session-pause-trigger-chain": return pb.ManagedItemType.MANAGED_ITEM_TYPE_CONSUMER_SESSION_PAUSE_TRIGGER_CHAIN;
    case "producer-session-config": return pb.ManagedItemType.MANAGED_ITEM_TYPE_PRODUCER_SESSION_CONFIG;
    case "message-filter": return pb.ManagedItemType.MANAGED_ITEM_TYPE_MESSAGE_FILTER;
    case "message-filter-chain": return pb.ManagedItemType.MANAGED_ITEM_TYPE_MESSAGE_FILTER_CHAIN;
    case "coloring-rule": return pb.ManagedItemType.MANAGED_ITEM_TYPE_COLORING_RULE;
    case "coloring-rule-chain": return pb.ManagedItemType.MANAGED_ITEM_TYPE_COLORING_RULE_CHAIN;
    case "markdown-document": return pb.ManagedItemType.MANAGED_ITEM_TYPE_MARKDOWN_DOCUMENT;
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
  return { hexString: hexStringFromByteArray(v.getMessageId()?.getMessageId_asU8()!, 'hex-with-space') };
}

export function managedMessageIdSpecToPb(v: t.ManagedMessageIdSpec): pb.ManagedMessageIdSpec {
  const specPb = new pb.ManagedMessageIdSpec();
  const messageIdPb = new consumerPb.MessageId();
  messageIdPb.setMessageId(hexStringToByteArray(v.hexString));
  specPb.setMessageId(messageIdPb);

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
  switch (v.getValOrRefCase()) {
    case pb.ManagedMessageIdValOrRef.ValOrRefCase.VAL:
      return {
        type: 'value',
        val: managedMessageIdFromPb(v.getVal()!)
      };
    case pb.ManagedMessageIdValOrRef.ValOrRefCase.REF:
      return {
        type: 'reference',
        ref: v.getRef()
      };
    default:
      throw new Error(`Unknown ManagedMessageIdValOrRef: ${v}`);
  }
}

export function managedMessageIdValOrRefToPb(v: t.ManagedMessageIdValOrRef): pb.ManagedMessageIdValOrRef {
  const idPb = new pb.ManagedMessageIdValOrRef();
  switch (v.type) {
    case 'value':
      idPb.setVal(managedMessageIdToPb(v.val));
      break;
    case 'reference':
      idPb.setRef(v.ref);
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
  switch (v.getValOrRefCase()) {
    case pb.ManagedDateTimeValOrRef.ValOrRefCase.VAL:
      return {
        type: 'value',
        val: managedDateTimeFromPb(v.getVal()!)
      };
    case pb.ManagedDateTimeValOrRef.ValOrRefCase.REF:
      return {
        type: 'reference',
        ref: v.getRef()
      };
    default:
      throw new Error(`Unknown ManagedDateTimeValOrRef: ${v}`);
  }
}

export function managedDateTimeValOrRefToPb(v: t.ManagedDateTimeValOrRef): pb.ManagedDateTimeValOrRef {
  const idPb = new pb.ManagedDateTimeValOrRef();
  switch (v.type) {
    case 'value':
      idPb.setVal(managedDateTimeToPb(v.val));
      break;
    case 'reference':
      idPb.setRef(v.ref);
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
  switch (v.getValOrRefCase()) {
    case pb.ManagedRelativeDateTimeValOrRef.ValOrRefCase.VAL:
      return {
        type: 'value',
        val: managedRelativeDateTimeFromPb(v.getVal()!)
      };
    case pb.ManagedRelativeDateTimeValOrRef.ValOrRefCase.REF:
      return {
        type: 'reference',
        ref: v.getRef()
      };
    default:
      throw new Error(`Unknown ManagedRelativeDateTimeValOrRef: ${v}`);
  }
}

export function managedRelativeDateTimeValOrRefToPb(v: t.ManagedRelativeDateTimeValOrRef): pb.ManagedRelativeDateTimeValOrRef {
  const idPb = new pb.ManagedRelativeDateTimeValOrRef();
  switch (v.type) {
    case 'value':
      idPb.setVal(managedRelativeDateTimeToPb(v.val));
      break;
    case 'reference':
      idPb.setRef(v.ref);
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
  switch (v.getValOrRefCase()) {
    case pb.ManagedConsumerSessionStartFromValOrRef.ValOrRefCase.VAL:
      return {
        type: 'value',
        val: managedConsumerSessionStartFromFromPb(v.getVal()!)
      };
    case pb.ManagedConsumerSessionStartFromValOrRef.ValOrRefCase.REF:
      return {
        type: 'reference',
        ref: v.getRef()
      };
    default:
      throw new Error(`Unknown ManagedConsumerSessionStartFromValOrRef: ${v}`);
  }
}

export function managedConsumerSessionStartFromValOrRefToPb(v: t.ManagedConsumerSessionStartFromValOrRef): pb.ManagedConsumerSessionStartFromValOrRef {
  const idPb = new pb.ManagedConsumerSessionStartFromValOrRef();
  switch (v.type) {
    case 'value':
      idPb.setVal(managedConsumerSessionStartFromToPb(v.val));
      break;
    case 'reference':
      idPb.setRef(v.ref);
      break;
    default:
      throw new Error(`Unknown ManagedConsumerSessionStartFromValOrRef: ${v}`);
  }
  return idPb;
}

export function managedConsumerSessionEventSpecFromPb(v: pb.ManagedConsumerSessionEventSpec): t.ManagedConsumerSessionEventSpec {
  switch (v.getEventCase()) {
    case pb.ManagedConsumerSessionEventSpec.EventCase.EVENT_MESSAGES_PROCESSED:
      return { event: consumerSessionEventMessagesProcessedFromPb(v.getEventMessagesProcessed()!) };
    case pb.ManagedConsumerSessionEventSpec.EventCase.EVENT_MESSAGES_DELIVERED:
      return { event: consumerSessionEventMessagesDeliveredFromPb(v.getEventMessagesDelivered()!) };
    case pb.ManagedConsumerSessionEventSpec.EventCase.EVENT_BYTES_PROCESSED:
      return { event: consumerSessionEventBytesProcessedFromPb(v.getEventBytesProcessed()!) };
    case pb.ManagedConsumerSessionEventSpec.EventCase.EVENT_BYTES_DELIVERED:
      return { event: consumerSessionEventBytesDeliveredFromPb(v.getEventBytesDelivered()!) };
    case pb.ManagedConsumerSessionEventSpec.EventCase.EVENT_MESSAGE_DECODE_FAILED:
      return { event: consumerSessionEventMessageDecodeFailedFromPb(v.getEventMessageDecodeFailed()!) };
    case pb.ManagedConsumerSessionEventSpec.EventCase.EVENT_TIME_ELAPSED:
      return { event: consumerSessionEventTimeElapsedFromPb(v.getEventTimeElapsed()!) };
    case pb.ManagedConsumerSessionEventSpec.EventCase.EVENT_TOPIC_END_REACHED:
      return { event: consumerSessionEventTopicEndReachedFromPb(v.getEventTopicEndReached()!) };
    case pb.ManagedConsumerSessionEventSpec.EventCase.EVENT_UNEXPECTED_ERROR_OCCURRED:
      return { event: consumerSessionEventUnexpectedErrorOccurredFromPb(v.getEventUnexpectedErrorOccurred()!) };
    default:
      throw new Error(`Unknown ManagedConsumerSessionEventSpec: ${v}`);
  }
}

export function managedConsumerSessionEventSpecToPb(v: t.ManagedConsumerSessionEventSpec): pb.ManagedConsumerSessionEventSpec {
  const specPb = new pb.ManagedConsumerSessionEventSpec();
  switch (v.event.type) {
    case 'messages-processed':
      specPb.setEventMessagesProcessed(consumerSessionEventMessagesProcessedToPb(v.event));
      break;
    case 'messages-delivered':
      specPb.setEventMessagesDelivered(consumerSessionEventMessagesDeliveredToPb(v.event));
      break;
    case 'bytes-processed':
      specPb.setEventBytesProcessed(consumerSessionEventBytesProcessedToPb(v.event));
      break;
    case 'bytes-delivered':
      specPb.setEventBytesDelivered(consumerSessionEventBytesDeliveredToPb(v.event));
      break;
    case 'decode-failed':
      specPb.setEventMessageDecodeFailed(consumerSessionEventMessageDecodeFailedToPb(v.event));
      break;
    case 'time-elapsed':
      specPb.setEventTimeElapsed(consumerSessionEventTimeElapsedToPb(v.event));
      break;
    case 'topic-end-reached':
      specPb.setEventTopicEndReached(consumerSessionEventTopicEndReachedToPb(v.event));
      break;
    case 'unexpected-error-occurred':
      specPb.setEventUnexpectedErrorOccurred(consumerSessionEventUnexpectedErrorOccurredToPb(v.event));
      break;
    default:
      throw new Error(`Unknown ManagedConsumerSessionEventSpec: ${v}`);
  }

  return specPb;
}

export function managedConsumerSessionEventFromPb(v: pb.ManagedConsumerSessionEvent): t.ManagedConsumerSessionEvent {
  return {
    metadata: managedItemMetadataFromPb(v.getMetadata()!),
    spec: managedConsumerSessionEventSpecFromPb(v.getSpec()!)
  };
}

export function managedConsumerSessionEventToPb(v: t.ManagedConsumerSessionEvent): pb.ManagedConsumerSessionEvent {
  const idPb = new pb.ManagedConsumerSessionEvent();
  idPb.setMetadata(managedItemMetadataToPb(v.metadata));
  idPb.setSpec(managedConsumerSessionEventSpecToPb(v.spec));
  return idPb;
}

export function managedConsumerSessionEventValOrRefFromPb(v: pb.ManagedConsumerSessionEventValOrRef): t.ManagedConsumerSessionEventValOrRef {
  switch (v.getValOrRefCase()) {
    case pb.ManagedConsumerSessionEventValOrRef.ValOrRefCase.VAL:
      return {
        type: 'value',
        val: managedConsumerSessionEventFromPb(v.getVal()!)
      };
    case pb.ManagedConsumerSessionEventValOrRef.ValOrRefCase.REF:
      return {
        type: 'reference',
        ref: v.getRef()
      };
    default:
      throw new Error(`Unknown ManagedConsumerSessionEventValOrRef: ${v}`);
  }
}

export function managedConsumerSessionEventValOrRefToPb(v: t.ManagedConsumerSessionEventValOrRef): pb.ManagedConsumerSessionEventValOrRef {
  const valOrRef = new pb.ManagedConsumerSessionEventValOrRef();
  switch (v.type) {
    case 'value':
      valOrRef.setVal(managedConsumerSessionEventToPb(v.val));
      break;
    case 'reference':
      valOrRef.setRef(v.ref);
      break;
    default:
      throw new Error(`Unknown ManagedConsumerSessionEventValOrRef: ${v}`);
  }
  return valOrRef;
}

export function managedConsumerSessionPauseTriggerChainSpecFromPb(v: pb.ManagedConsumerSessionPauseTriggerChainSpec): t.ManagedConsumerSessionPauseTriggerChainSpec {
  return {
    events: v.getEventsList().map(managedConsumerSessionEventValOrRefFromPb),
    mode: consumerSessionPauseTriggerChainModeFromPb(v.getMode())
  };
}

export function managedConsumerSessionPauseTriggerChainSpecToPb(v: t.ManagedConsumerSessionPauseTriggerChainSpec): pb.ManagedConsumerSessionPauseTriggerChainSpec {
  const specPb = new pb.ManagedConsumerSessionPauseTriggerChainSpec();
  specPb.setEventsList(v.events.map(managedConsumerSessionEventValOrRefToPb));
  specPb.setMode(consumerSessionPauseTriggerChainModeToPb(v.mode));
  return specPb;
}

export function managedConsumerSessionPauseTriggerChainFromPb(v: pb.ManagedConsumerSessionPauseTriggerChain): t.ManagedConsumerSessionPauseTriggerChain {
  return {
    metadata: managedItemMetadataFromPb(v.getMetadata()!),
    spec: managedConsumerSessionPauseTriggerChainSpecFromPb(v.getSpec()!)
  };
}

export function managedConsumerSessionPauseTriggerChainToPb(v: t.ManagedConsumerSessionPauseTriggerChain): pb.ManagedConsumerSessionPauseTriggerChain {
  const idPb = new pb.ManagedConsumerSessionPauseTriggerChain();
  idPb.setMetadata(managedItemMetadataToPb(v.metadata));
  idPb.setSpec(managedConsumerSessionPauseTriggerChainSpecToPb(v.spec));
  return idPb;
}

export function managedConsumerSessionPauseTriggerChainValOrRefFromPb(v: pb.ManagedConsumerSessionPauseTriggerChainValOrRef): t.ManagedConsumerSessionPauseTriggerChainValOrRef {
  switch (v.getValOrRefCase()) {
    case pb.ManagedConsumerSessionPauseTriggerChainValOrRef.ValOrRefCase.VAL:
      return {
        type: 'value',
        val: managedConsumerSessionPauseTriggerChainFromPb(v.getVal()!)
      };
    case pb.ManagedConsumerSessionPauseTriggerChainValOrRef.ValOrRefCase.REF:
      return {
        type: 'reference',
        ref: v.getRef()
      };
    default:
      throw new Error(`Unknown ManagedConsumerSessionPauseTriggerChainValOrRef: ${v}`);
  }
}

export function managedConsumerSessionPauseTriggerChainValOrRefToPb(v: t.ManagedConsumerSessionPauseTriggerChainValOrRef): pb.ManagedConsumerSessionPauseTriggerChainValOrRef {
  const valOrRef = new pb.ManagedConsumerSessionPauseTriggerChainValOrRef();
  switch (v.type) {
    case 'value':
      valOrRef.setVal(managedConsumerSessionPauseTriggerChainToPb(v.val));
      break;
    case 'reference':
      valOrRef.setRef(v.ref);
      break;
    default:
      throw new Error(`Unknown ManagedConsumerSessionPauseTriggerChainValOrRef: ${v}`);
  }
  return valOrRef;
}

export function managedMessageFilterSpecFromPb(v: pb.ManagedMessageFilterSpec): t.ManagedMessageFilterSpec {
  return messageFilterFromPb(v.getMessageFilter()!)
}

export function managedMessageFilterSpecToPb(v: t.ManagedMessageFilterSpec): pb.ManagedMessageFilterSpec {
  const specPb = new pb.ManagedMessageFilterSpec();
  specPb.setMessageFilter(messageFilterToPb(v));
  return specPb;
}

export function managedMessageFilterFromPb(v: pb.ManagedMessageFilter): t.ManagedMessageFilter {
  return {
    metadata: managedItemMetadataFromPb(v.getMetadata()!),
    spec: managedMessageFilterSpecFromPb(v.getSpec()!)
  };
}

export function managedMessageFilterToPb(v: t.ManagedMessageFilter): pb.ManagedMessageFilter {
  const filterPb = new pb.ManagedMessageFilter();
  filterPb.setMetadata(managedItemMetadataToPb(v.metadata));
  filterPb.setSpec(managedMessageFilterSpecToPb(v.spec));
  return filterPb;
}

export function managedMessageFilterValOrRefFromPb(v: pb.ManagedMessageFilterValOrRef): t.ManagedMessageFilterValOrRef {
  switch (v.getValOrRefCase()) {
    case pb.ManagedMessageFilterValOrRef.ValOrRefCase.VAL:
      return {
        type: 'value',
        val: managedMessageFilterFromPb(v.getVal()!)
      };
    case pb.ManagedMessageFilterValOrRef.ValOrRefCase.REF:
      return {
        type: 'reference',
        ref: v.getRef()
      };
    default:
      throw new Error(`Unknown ManagedMessageFilterValOrRef: ${v}`);
  }
}

export function managedMessageFilterValOrRefToPb(v: t.ManagedMessageFilterValOrRef): pb.ManagedMessageFilterValOrRef {
  const filterPb = new pb.ManagedMessageFilterValOrRef();
  switch (v.type) {
    case 'value':
      filterPb.setVal(managedMessageFilterToPb(v.val));
      break;
    case 'reference':
      filterPb.setRef(v.ref);
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
  switch (v.getValOrRefCase()) {
    case pb.ManagedMessageFilterChainValOrRef.ValOrRefCase.VAL:
      return {
        type: 'value',
        val: managedMessageFilterChainFromPb(v.getVal()!)
      };
    case pb.ManagedMessageFilterChainValOrRef.ValOrRefCase.REF:
      return {
        type: 'reference',
        ref: v.getRef()
      };
    default:
      throw new Error(`Unknown ManagedMessageFilterChainValOrRef: ${v}`);
  }
}

export function managedMessageFilterChainValOrRefToPb(v: t.ManagedMessageFilterChainValOrRef): pb.ManagedMessageFilterChainValOrRef {
  const chainPb = new pb.ManagedMessageFilterChainValOrRef();
  switch (v.type) {
    case 'value':
      chainPb.setVal(managedMessageFilterChainToPb(v.val));
      break;
    case 'reference':
      chainPb.setRef(v.ref);
      break;
    default:
      throw new Error(`Unknown ManagedMessageFilterChainValOrRef: ${v}`);
  }
  return chainPb;
}

export function currentTopicSelectorFromPb(v: pb.CurrentTopicSelector): t.CurrentTopicSelector {
  return { type: 'current-topic' };
}

export function currentTopicSelectorToPb(v: t.CurrentTopicSelector): pb.CurrentTopicSelector {
  return new pb.CurrentTopicSelector();
}

export function managedTopicSelectorSpecFromPb(v: pb.ManagedTopicSelectorSpec): t.ManagedTopicSelectorSpec {
  switch (v.getTopicSelectorCase()) {
    case pb.ManagedTopicSelectorSpec.TopicSelectorCase.CURRENT_TOPIC_SELECTOR:
      return { topicSelector: currentTopicSelectorFromPb(v.getCurrentTopicSelector()!) };
    case pb.ManagedTopicSelectorSpec.TopicSelectorCase.MULTI_TOPIC_SELECTOR:
      return { topicSelector: multiTopicSelectorFromPb(v.getMultiTopicSelector()!) };
    case pb.ManagedTopicSelectorSpec.TopicSelectorCase.NAMESPACED_REGEX_TOPIC_SELECTOR:
      return { topicSelector: namespacedRegexTopicSelectorFromPb(v.getNamespacedRegexTopicSelector()!) };
    default:
      throw new Error(`Unknown ManagedTopicsSelectorSpec: ${v}`);
  }
}

export function managedTopicSelectorSpecToPb(v: t.ManagedTopicSelectorSpec): pb.ManagedTopicSelectorSpec {
  const specPb = new pb.ManagedTopicSelectorSpec();
  switch (v.topicSelector.type) {
    case 'current-topic':
      specPb.setCurrentTopicSelector(currentTopicSelectorToPb(v.topicSelector));
      break;
    case 'multi-topic-selector':
      specPb.setMultiTopicSelector(multiTopicSelectorToPb(v.topicSelector));
      break;
    case 'namespaced-regex-topic-selector':
      specPb.setNamespacedRegexTopicSelector(namespacedRegexTopicSelectorToPb(v.topicSelector));
      break;
    default:
      throw new Error(`Unknown ManagedTopicsSelectorSpec: ${v}`);
  }
  return specPb;
}

export function managedTopicSelectorFromPb(v: pb.ManagedTopicSelector): t.ManagedTopicSelector {
  return {
    metadata: managedItemMetadataFromPb(v.getMetadata()!),
    spec: managedTopicSelectorSpecFromPb(v.getSpec()!)
  };
}

export function managedTopicSelectorToPb(v: t.ManagedTopicSelector): pb.ManagedTopicSelector {
  const selectorPb = new pb.ManagedTopicSelector();
  selectorPb.setMetadata(managedItemMetadataToPb(v.metadata));
  selectorPb.setSpec(managedTopicSelectorSpecToPb(v.spec));
  return selectorPb;
}

export function managedTopicSelectorValOrRefFromPb(v: pb.ManagedTopicSelectorValOrRef): t.ManagedTopicSelectorValOrRef {
  switch (v.getValOrRefCase()) {
    case pb.ManagedTopicSelectorValOrRef.ValOrRefCase.VAL:
      return {
        type: 'value',
        val: managedTopicSelectorFromPb(v.getVal()!)
      };
    case pb.ManagedTopicSelectorValOrRef.ValOrRefCase.REF:
      return {
        type: 'reference',
        ref: v.getRef()
      };
    default:
      throw new Error(`Unknown ManagedTopicSelectorValOrRef: ${v}`);
  }
}

export function managedTopicSelectorValOrRefToPb(v: t.ManagedTopicSelectorValOrRef): pb.ManagedTopicSelectorValOrRef {
  const valOrRefPb = new pb.ManagedTopicSelectorValOrRef();
  switch (v.type) {
    case 'value':
      valOrRefPb.setVal(managedTopicSelectorToPb(v.val));
      break;
    case 'reference':
      valOrRefPb.setRef(v.ref);
      break;
    default:
      throw new Error(`Unknown ManagedTopicSelectorValOrRef: ${v}`);
  }
  return valOrRefPb;
}

export function managedColoringRuleSpecFromPb(v: pb.ManagedColoringRuleSpec): t.ManagedColoringRuleSpec {
  return {
    isEnabled: v.getIsEnabled(),
    messageFilterChain: managedMessageFilterChainValOrRefFromPb(v.getMessageFilterChain()!),
    backgroundColor: v.getBackgroundColor(),
    foregroundColor: v.getForegroundColor()
  };
}

export function managedColoringRuleSpecToPb(v: t.ManagedColoringRuleSpec): pb.ManagedColoringRuleSpec {
  const specPb = new pb.ManagedColoringRuleSpec();
  specPb.setIsEnabled(v.isEnabled);
  specPb.setMessageFilterChain(managedMessageFilterChainValOrRefToPb(v.messageFilterChain));
  specPb.setBackgroundColor(v.backgroundColor);
  specPb.setForegroundColor(v.foregroundColor);
  return specPb;
}

export function managedColoringRuleFromPb(v: pb.ManagedColoringRule): t.ManagedColoringRule {
  return {
    metadata: managedItemMetadataFromPb(v.getMetadata()!),
    spec: managedColoringRuleSpecFromPb(v.getSpec()!)
  };
}

export function managedColoringRuleToPb(v: t.ManagedColoringRule): pb.ManagedColoringRule {
  const rulePb = new pb.ManagedColoringRule();
  rulePb.setMetadata(managedItemMetadataToPb(v.metadata));
  rulePb.setSpec(managedColoringRuleSpecToPb(v.spec));
  return rulePb;
}

export function managedColoringRuleValOrRefFromPb(v: pb.ManagedColoringRuleValOrRef): t.ManagedColoringRuleValOrRef {
  switch (v.getValOrRefCase()) {
    case pb.ManagedColoringRuleValOrRef.ValOrRefCase.VAL:
      return {
        type: 'value',
        val: managedColoringRuleFromPb(v.getVal()!)
      };
    case pb.ManagedColoringRuleValOrRef.ValOrRefCase.REF:
      return {
        type: 'reference',
        ref: v.getRef()
      };
    default:
      throw new Error(`Unknown ManagedColoringRuleValOrRef: ${v}`);
  }
}

export function managedColoringRuleValOrRefToPb(v: t.ManagedColoringRuleValOrRef): pb.ManagedColoringRuleValOrRef {
  const valOrRefPb = new pb.ManagedColoringRuleValOrRef();
  switch (v.type) {
    case 'value':
      valOrRefPb.setVal(managedColoringRuleToPb(v.val));
      break;
    case 'reference':
      valOrRefPb.setRef(v.ref);
      break;
    default:
      throw new Error(`Unknown ManagedColoringRuleValOrRef: ${v}`);
  }
  return valOrRefPb;
}

export function managedColoringRuleChainSpecFromPb(v: pb.ManagedColoringRuleChainSpec): t.ManagedColoringRuleChainSpec {
  return {
    isEnabled: v.getIsEnabled(),
    coloringRules: v.getColoringRulesList().map(managedColoringRuleValOrRefFromPb)
  }
}

export function managedColoringRuleChainSpecToPb(v: t.ManagedColoringRuleChainSpec): pb.ManagedColoringRuleChainSpec {
  const specPb = new pb.ManagedColoringRuleChainSpec();
  specPb.setIsEnabled(v.isEnabled);
  specPb.setColoringRulesList(v.coloringRules.map(managedColoringRuleValOrRefToPb));
  return specPb;
}

export function managedColoringRuleChainFromPb(v: pb.ManagedColoringRuleChain): t.ManagedColoringRuleChain {
  return {
    metadata: managedItemMetadataFromPb(v.getMetadata()!),
    spec: managedColoringRuleChainSpecFromPb(v.getSpec()!)
  };
}

export function managedColoringRuleChainToPb(v: t.ManagedColoringRuleChain): pb.ManagedColoringRuleChain {
  const chainPb = new pb.ManagedColoringRuleChain();
  chainPb.setMetadata(managedItemMetadataToPb(v.metadata));
  chainPb.setSpec(managedColoringRuleChainSpecToPb(v.spec));

  return chainPb;
}

export function managedColoringRuleChainValOrRefFromPb(v: pb.ManagedColoringRuleChainValOrRef): t.ManagedColoringRuleChainValOrRef {
  switch (v.getValOrRefCase()) {
    case pb.ManagedColoringRuleChainValOrRef.ValOrRefCase.VAL:
      return {
        type: 'value',
        val: managedColoringRuleChainFromPb(v.getVal()!)
      };
    case pb.ManagedColoringRuleChainValOrRef.ValOrRefCase.REF:
      return {
        type: 'reference',
        ref: v.getRef()
      };
    default:
      throw new Error(`Unknown ManagedColoringRuleChainValOrRef: ${v}`);
  }
}

export function managedColoringRuleChainValOrRefToPb(v: t.ManagedColoringRuleChainValOrRef): pb.ManagedColoringRuleChainValOrRef {
  const idPb = new pb.ManagedColoringRuleChainValOrRef();
  switch (v.type) {
    case 'value':
      idPb.setVal(managedColoringRuleChainToPb(v.val));
      break;
    case 'reference':
      idPb.setRef(v.ref);
      break;
    default:
      throw new Error(`Unknown ManagedColoringRuleChainValOrRef: ${v}`);
  }
  return idPb;
}

export function managedConsumerSessionTargetSpecFromPb(v: pb.ManagedConsumerSessionTargetSpec): t.ManagedConsumerSessionTargetSpec {
  return {
    topicSelector: managedTopicSelectorValOrRefFromPb(v.getTopicSelector()!),
    coloringRuleChain: managedColoringRuleChainValOrRefFromPb(v.getColoringRuleChain()!),
    messageFilterChain: managedMessageFilterChainValOrRefFromPb(v.getMessageFilterChain()!),
  };
}

export function managedConsumerSessionTargetSpecToPb(v: t.ManagedConsumerSessionTargetSpec): pb.ManagedConsumerSessionTargetSpec {
  const specPb = new pb.ManagedConsumerSessionTargetSpec();
  specPb.setTopicSelector(managedTopicSelectorValOrRefToPb(v.topicSelector));
  specPb.setColoringRuleChain(managedColoringRuleChainValOrRefToPb(v.coloringRuleChain));
  specPb.setMessageFilterChain(managedMessageFilterChainValOrRefToPb(v.messageFilterChain));
  return specPb;
}

export function managedConsumerSessionTargetFromPb(v: pb.ManagedConsumerSessionTarget): t.ManagedConsumerSessionTarget {
  return {
    metadata: managedItemMetadataFromPb(v.getMetadata()!),
    spec: managedConsumerSessionTargetSpecFromPb(v.getSpec()!)
  };
}

export function managedConsumerSessionTargetToPb(v: t.ManagedConsumerSessionTarget): pb.ManagedConsumerSessionTarget {
  const topicPb = new pb.ManagedConsumerSessionTarget();
  topicPb.setMetadata(managedItemMetadataToPb(v.metadata));
  topicPb.setSpec(managedConsumerSessionTargetSpecToPb(v.spec));
  return topicPb;
}

export function managedConsumerSessionTargetValOrRefFromPb(v: pb.ManagedConsumerSessionTargetValOrRef): t.ManagedConsumerSessionTargetValOrRef {
  switch (v.getValOrRefCase()) {
    case pb.ManagedConsumerSessionTargetValOrRef.ValOrRefCase.VAL:
      return {
        type: 'value',
        val: managedConsumerSessionTargetFromPb(v.getVal()!)
      };
    case pb.ManagedConsumerSessionTargetValOrRef.ValOrRefCase.REF:
      return {
        type: 'reference',
        ref: v.getRef()
      };
    default:
      throw new Error(`Unknown ManagedConsumerSessionTargetValOrRef: ${v}`);
  }
}

export function managedConsumerSessionTargetValOrRefToPb(v: t.ManagedConsumerSessionTargetValOrRef): pb.ManagedConsumerSessionTargetValOrRef {
  const topicPb = new pb.ManagedConsumerSessionTargetValOrRef();
  switch (v.type) {
    case 'value':
      topicPb.setVal(managedConsumerSessionTargetToPb(v.val));
      break;
    case 'reference':
      topicPb.setRef(v.ref);
      break;
    default:
      throw new Error(`Unknown ManagedConsumerSessionTargetValOrRef: ${v}`);
  }
  return topicPb;
}

export function managedConsumerSessionConfigSpecFromPb(v: pb.ManagedConsumerSessionConfigSpec): t.ManagedConsumerSessionConfigSpec {
  return {
    startFrom: managedConsumerSessionStartFromValOrRefFromPb(v.getStartFrom()!),
    targets: v.getTargetsList().map(managedConsumerSessionTargetValOrRefFromPb),
    messageFilterChain: managedMessageFilterChainValOrRefFromPb(v.getMessageFilterChain()!),
    pauseTriggerChain: managedConsumerSessionPauseTriggerChainValOrRefFromPb(v.getPauseTriggerChain()!),
    coloringRuleChain: managedColoringRuleChainValOrRefFromPb(v.getColoringRuleChain()!),
  };
}

export function managedConsumerSessionConfigSpecToPb(v: t.ManagedConsumerSessionConfigSpec): pb.ManagedConsumerSessionConfigSpec {
  const specPb = new pb.ManagedConsumerSessionConfigSpec();
  specPb.setStartFrom(managedConsumerSessionStartFromValOrRefToPb(v.startFrom));
  specPb.setTargetsList(v.targets.map(managedConsumerSessionTargetValOrRefToPb));
  specPb.setMessageFilterChain(managedMessageFilterChainValOrRefToPb(v.messageFilterChain));
  specPb.setPauseTriggerChain(managedConsumerSessionPauseTriggerChainValOrRefToPb(v.pauseTriggerChain));
  specPb.setColoringRuleChain(managedColoringRuleChainValOrRefToPb(v.coloringRuleChain));

  return specPb;
}

export function managedConsumerSessionConfigFromPb(v: pb.ManagedConsumerSessionConfig): t.ManagedConsumerSessionConfig {
  return {
    metadata: managedItemMetadataFromPb(v.getMetadata()!),
    spec: managedConsumerSessionConfigSpecFromPb(v.getSpec()!)
  };
}

export function managedConsumerSessionConfigToPb(v: t.ManagedConsumerSessionConfig): pb.ManagedConsumerSessionConfig {
  const configPb = new pb.ManagedConsumerSessionConfig();
  configPb.setMetadata(managedItemMetadataToPb(v.metadata));
  configPb.setSpec(managedConsumerSessionConfigSpecToPb(v.spec));
  return configPb;
}

export function managedConsumerSessionConfigValOrRefFromPb(v: pb.ManagedConsumerSessionConfigValOrRef): t.ManagedConsumerSessionConfigValOrRef {
  switch (v.getValOrRefCase()) {
    case pb.ManagedConsumerSessionConfigValOrRef.ValOrRefCase.VAL:
      return {
        type: 'value',
        val: managedConsumerSessionConfigFromPb(v.getVal()!)
      };
    case pb.ManagedConsumerSessionConfigValOrRef.ValOrRefCase.REF:
      return {
        type: 'reference',
        ref: v.getRef()
      };
    default:
      throw new Error(`Unknown ManagedConsumerSessionConfigValOrRef: ${v}`);
  }
}

export function managedConsumerSessionConfigValOrRefToPb(v: t.ManagedConsumerSessionConfigValOrRef): pb.ManagedConsumerSessionConfigValOrRef {
  const idPb = new pb.ManagedConsumerSessionConfigValOrRef();
  switch (v.type) {
    case 'value':
      idPb.setVal(managedConsumerSessionConfigToPb(v.val));
      break;
    case 'reference':
      idPb.setRef(v.ref);
      break;
    default:
      throw new Error(`Unknown ManagedConsumerSessionConfigValOrRef: ${v}`);
  }
  return idPb;
}

export function managedMarkdownDocumentSpecFromPb(v: pb.ManagedMarkdownDocumentSpec): t.ManagedMarkdownDocumentSpec {
  return {
    markdown: v.getMarkdown()
  };
}

export function managedMarkdownDocumentSpecToPb(v: t.ManagedMarkdownDocumentSpec): pb.ManagedMarkdownDocumentSpec {
  const specPb = new pb.ManagedMarkdownDocumentSpec();
  specPb.setMarkdown(v.markdown);

  return specPb;
}

export function managedMarkdownDocumentFromPb(v: pb.ManagedMarkdownDocument): t.ManagedMarkdownDocument {
  return {
    metadata: managedItemMetadataFromPb(v.getMetadata()!),
    spec: managedMarkdownDocumentSpecFromPb(v.getSpec()!)
  };
}

export function managedMarkdownDocumentToPb(v: t.ManagedMarkdownDocument): pb.ManagedMarkdownDocument {
  const configPb = new pb.ManagedMarkdownDocument();
  configPb.setMetadata(managedItemMetadataToPb(v.metadata));
  configPb.setSpec(managedMarkdownDocumentSpecToPb(v.spec));
  return configPb;
}

export function managedMarkdownDocumentValOrRefFromPb(v: pb.ManagedMarkdownDocumentValOrRef): t.ManagedMarkdownDocumentValOrRef {
  switch (v.getValOrRefCase()) {
    case pb.ManagedMarkdownDocumentValOrRef.ValOrRefCase.VAL:
      return {
        type: 'value',
        val: managedMarkdownDocumentFromPb(v.getVal()!)
      };
    case pb.ManagedMarkdownDocumentValOrRef.ValOrRefCase.REF:
      return {
        type: 'reference',
        ref: v.getRef()
      };
    default:
      throw new Error(`Unknown ManagedMarkdownDocumentValOrRef: ${v}`);
  }
}

export function managedMarkdownDocumentValOrRefToPb(v: t.ManagedMarkdownDocumentValOrRef): pb.ManagedMarkdownDocumentValOrRef {
  const idPb = new pb.ManagedMarkdownDocumentValOrRef();
  switch (v.type) {
    case 'value':
      idPb.setVal(managedMarkdownDocumentToPb(v.val));
      break;
    case 'reference':
      idPb.setRef(v.ref);
      break;
    default:
      throw new Error(`Unknown ManagedMarkdownDocumentValOrRef: ${v}`);
  }
  return idPb;
}

export function managedItemFromPb(v: pb.ManagedItem): t.ManagedItem {
  switch (v.getSpecCase()) {
    case pb.ManagedItem.SpecCase.SPEC_MESSAGE_ID:
      return managedMessageIdFromPb(v.getSpecMessageId()!);
    case pb.ManagedItem.SpecCase.SPEC_DATE_TIME:
      return managedDateTimeFromPb(v.getSpecDateTime()!);
    case pb.ManagedItem.SpecCase.SPEC_RELATIVE_DATE_TIME:
      return managedRelativeDateTimeFromPb(v.getSpecRelativeDateTime()!);
    case pb.ManagedItem.SpecCase.SPEC_TOPIC_SELECTOR:
      return managedTopicSelectorFromPb(v.getSpecTopicSelector()!);
    case pb.ManagedItem.SpecCase.SPEC_COLORING_RULE:
      return managedColoringRuleFromPb(v.getSpecColoringRule()!);
    case pb.ManagedItem.SpecCase.SPEC_COLORING_RULE_CHAIN:
      return managedColoringRuleChainFromPb(v.getSpecColoringRuleChain()!);
    case pb.ManagedItem.SpecCase.SPEC_MESSAGE_FILTER:
      return managedMessageFilterFromPb(v.getSpecMessageFilter()!);
    case pb.ManagedItem.SpecCase.SPEC_MESSAGE_FILTER_CHAIN:
      return managedMessageFilterChainFromPb(v.getSpecMessageFilterChain()!);
    case pb.ManagedItem.SpecCase.SPEC_CONSUMER_SESSION_START_FROM:
      return managedConsumerSessionStartFromFromPb(v.getSpecConsumerSessionStartFrom()!);
    case pb.ManagedItem.SpecCase.SPEC_CONSUMER_SESSION_EVENT:
      return managedConsumerSessionEventFromPb(v.getSpecConsumerSessionEvent()!);
    case pb.ManagedItem.SpecCase.SPEC_CONSUMER_SESSION_PAUSE_TRIGGER_CHAIN:
      return managedConsumerSessionPauseTriggerChainFromPb(v.getSpecConsumerSessionPauseTriggerChain()!);
    case pb.ManagedItem.SpecCase.SPEC_CONSUMER_SESSION_TARGET:
      return managedConsumerSessionTargetFromPb(v.getSpecConsumerSessionTarget()!);
    case pb.ManagedItem.SpecCase.SPEC_CONSUMER_SESSION_CONFIG:
      return managedConsumerSessionConfigFromPb(v.getSpecConsumerSessionConfig()!);
    case pb.ManagedItem.SpecCase.SPEC_MARKDOWN_DOCUMENT:
      return managedMarkdownDocumentFromPb(v.getSpecMarkdownDocument()!);
    default:
      throw new Error(`Unknown ManagedItem: ${v}`);
  }
}

export function managedItemToPb(v: t.ManagedItem): pb.ManagedItem {
  const itemPb = new pb.ManagedItem();
  switch (v.metadata.type) {
    case "message-id": {
      itemPb.setSpecMessageId(managedMessageIdToPb(v as t.ManagedMessageId));
      break;
    }
    case "date-time": {
      itemPb.setSpecDateTime(managedDateTimeToPb(v as t.ManagedDateTime));
      break;
    }
    case "relative-date-time": {
      itemPb.setSpecRelativeDateTime(managedRelativeDateTimeToPb(v as t.ManagedRelativeDateTime));
      break;
    }
    case "topic-selector": {
      itemPb.setSpecTopicSelector(managedTopicSelectorToPb(v as t.ManagedTopicSelector));
      break;
    }
    case "coloring-rule": {
      itemPb.setSpecColoringRule(managedColoringRuleToPb(v as t.ManagedColoringRule));
      break;
    }
    case "coloring-rule-chain": {
      itemPb.setSpecColoringRuleChain(managedColoringRuleChainToPb(v as t.ManagedColoringRuleChain));
      break;
    }
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
    case "consumer-session-event": {
      itemPb.setSpecConsumerSessionEvent(managedConsumerSessionEventToPb(v as t.ManagedConsumerSessionEvent));
      break;
    }
    case "consumer-session-pause-trigger-chain": {
      itemPb.setSpecConsumerSessionPauseTriggerChain(managedConsumerSessionPauseTriggerChainToPb(v as t.ManagedConsumerSessionPauseTriggerChain));
      break;
    }
    case "consumer-session-target": {
      itemPb.setSpecConsumerSessionTarget(managedConsumerSessionTargetToPb(v as t.ManagedConsumerSessionTarget));
      break;
    }
    case "consumer-session-config": {
      itemPb.setSpecConsumerSessionConfig(managedConsumerSessionConfigToPb(v as t.ManagedConsumerSessionConfig));
      break;
    }
    case "markdown-document": {
      itemPb.setSpecMarkdownDocument(managedMarkdownDocumentToPb(v as t.ManagedMarkdownDocument));
      break;
    }
  }
  return itemPb;
}
