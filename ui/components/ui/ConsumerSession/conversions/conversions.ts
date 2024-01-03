import { Timestamp } from "google-protobuf/google/protobuf/timestamp_pb";
import * as pb from "../../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb";
import { hexStringFromByteArray, hexStringToByteArray } from "../../../conversions/conversions";
import {
  MessageDescriptor,
  PartialMessageDescriptor,
  ConsumerSessionConfig,
  MessageFilter,
  MessageFilterChain,
  MessageFilterChainMode,
  ConsumerSessionStartFrom,
  DateTimeUnit,
  ColoringRule,
  ColoringRuleChain,
  MessageId,
  ConsumerSessionEventMessagesProcessed,
  ConsumerSessionEventMessagesDelivered,
  ConsumerSessionEventBytesProcessed,
  ConsumerSessionEventBytesDelivered,
  ConsumerSessionEventMessageDecodeFailed,
  ConsumerSessionEventTimeElapsed,
  ConsumerSessionEventTopicEndReached,
  ConsumerSessionEventUnexpectedErrorOccurred,
  ConsumerSessionEventMessageId,
  ConsumerSessionEvent,
  ConsumerSessionPauseTriggerChainMode,
  ConsumerSessionPauseTriggerChain,
  ConsumerSessionTarget,
  TestResult,
  ChainTestResult,
  JsMessageFilter,
  ValueProjectionResult
} from "../types";

import {
  TopicSelector,
  MultiTopicSelector,
  NamespacedRegexTopicSelector,
  RegexSubscriptionMode,
} from '../topic-selector/topic-selector';
import { Int32Value, StringValue } from "google-protobuf/google/protobuf/wrappers_pb";
import { basicMessageFilterFromPb, basicMessageFilterTargetFromPb, basicMessageFilterTargetToPb, basicMessageFilterToPb } from "./basic-message-filter-conversions";
import { ValueProjection, ValueProjectionList } from "../value-projections/value-projections";

export function messageDescriptorFromPb(message: pb.Message): MessageDescriptor {
  const propertiesMap = Object.fromEntries(message.getPropertiesMap().toArray());
  const sessionMessageFilterChainTestResultPb = message.getSessionMessageFilterChainTestResult();
  const sessionTargetMessageFilterChainTestResultPb = message.getSessionTargetMessageFilterChainTestResult();

  return {
    index: -1, // This value will be set in another place.
    messageId: message.getMessageId()?.getValue_asU8() ?? null,
    rawValue: message.getRawValue()?.getValue_asU8() ?? null,
    value: message.getValue()?.getValue() ?? null,
    brokerPublishTime: message.getBrokerPublishTime()?.getValue() ?? null,
    eventTime: message.getEventTime()?.getValue() ?? null,
    isReplicated: message.getIsReplicated()?.getValue() ?? null,
    key: message.getKey()?.getValue() ?? null,
    orderingKey: message.getOrderingKey()?.getValue_asU8() ?? null,
    producerName: message.getProducerName()?.getValue() ?? null,
    properties: propertiesMap,
    publishTime: message.getPublishTime()?.getValue() ?? null,
    redeliveryCount: message.getRedeliveryCount()?.getValue() ?? null,
    replicatedFrom: message.getReplicatedFrom()?.getValue() ?? null,
    schemaVersion: message.getSchemaVersion()?.getValue() ?? null,
    sequenceId: message.getSequenceId()?.getValue() ?? null,
    size: message.getSize()?.getValue() ?? null,
    topic: message.getTopic()?.getValue() ?? null,
    sessionContextStateJson: message.getSessionContextStateJson()?.getValue() ?? null,
    debugStdout: message.getDebugStdout()?.getValue() ?? null,

    sessionTargetIndex: message.getSessionTargetIndex()?.getValue() ?? null,

    sessionColorRuleChainTestResults: message.getSessionColorRuleChainTestResultsList().map(chainTestResultFromPb),
    sessionTargetColorRuleChainTestResults: message.getSessionTargetColorRuleChainTestResultsList().map(chainTestResultFromPb),

    sessionMessageFilterChainTestResult: sessionMessageFilterChainTestResultPb === undefined ?
      undefined :
      chainTestResultFromPb(sessionMessageFilterChainTestResultPb),
    sessionTargetMessageFilterChainTestResult: sessionTargetMessageFilterChainTestResultPb === undefined ?
      undefined :
      chainTestResultFromPb(sessionTargetMessageFilterChainTestResultPb),

    sessionValueProjectionListResult: message.getSessionValueProjectionListResultList().map(valueProjectionResultFromPb),
    sessionTargetValueProjectionListResult: message.getSessionTargetValueProjectionListResultList().map(valueProjectionResultFromPb),
  };
}

export function partialMessageDescriptorToSerializable(message: PartialMessageDescriptor): any {
  let messageId: undefined | null | number[];
  if (message.messageId === undefined) {
    messageId = undefined;
  } else if (message.messageId === null) {
    messageId = null;
  } else {
    messageId = Array.from(message.messageId);
  }

  let value: undefined | null | any;
  if (message.value !== undefined && message.value !== null) {
    value = JSON.parse(message.value);
  }

  let sessionContextStateJson: undefined | null | any;
  if (message.sessionContextStateJson !== undefined && message.sessionContextStateJson !== null) {
    sessionContextStateJson = JSON.parse(message.sessionContextStateJson);
  }

  let rawValue: undefined | null | number[];
  if (message.rawValue === undefined) {
    rawValue = undefined;
  } else if (message.rawValue === null) {
    rawValue = null;
  } else {
    rawValue = Array.from(message.rawValue);
  }

  let orderingKey: undefined | null | number[];
  if (message.orderingKey === undefined) {
    orderingKey = undefined;
  } else if (message.orderingKey === null) {
    orderingKey = null;
  } else {
    orderingKey = Array.from(message.orderingKey);
  }

  return {
    index: message.index,
    messageId,
    rawValue,
    value,
    brokerPublishTime: message.brokerPublishTime,
    debugStdout: message.debugStdout,
    eventTime: message.eventTime,
    isReplicated: message.isReplicated,
    key: message.key,
    orderingKey,
    producerName: message.producerName,
    properties: message.properties,
    publishTime: message.publishTime,
    redeliveryCount: message.redeliveryCount,
    replicatedFrom: message.replicatedFrom,
    schemaVersion: message.schemaVersion,
    sequenceId: message.sequenceId,
    size: message.size,
    topic: message.topic,
    sessionContextStateJson,
  };
}

export function dateTimeUnitFromPb(unit: pb.DateTimeUnit): DateTimeUnit {
  switch (unit) {
    case pb.DateTimeUnit.DATE_TIME_UNIT_SECOND:
      return 'second';
    case pb.DateTimeUnit.DATE_TIME_UNIT_MINUTE:
      return 'minute';
    case pb.DateTimeUnit.DATE_TIME_UNIT_HOUR:
      return 'hour';
    case pb.DateTimeUnit.DATE_TIME_UNIT_DAY:
      return 'day';
    case pb.DateTimeUnit.DATE_TIME_UNIT_WEEK:
      return 'week';
    case pb.DateTimeUnit.DATE_TIME_UNIT_MONTH:
      return 'month';
    case pb.DateTimeUnit.DATE_TIME_UNIT_YEAR:
      return 'year';
    default:
      throw new Error(`Unknown date-time unit: ${unit}`);
  }
}

export function dateTimeUnitToPb(unit: DateTimeUnit): pb.DateTimeUnit {
  switch (unit) {
    case 'second':
      return pb.DateTimeUnit.DATE_TIME_UNIT_SECOND;
    case 'minute':
      return pb.DateTimeUnit.DATE_TIME_UNIT_MINUTE;
    case 'hour':
      return pb.DateTimeUnit.DATE_TIME_UNIT_HOUR;
    case 'day':
      return pb.DateTimeUnit.DATE_TIME_UNIT_DAY;
    case 'week':
      return pb.DateTimeUnit.DATE_TIME_UNIT_WEEK;
    case 'month':
      return pb.DateTimeUnit.DATE_TIME_UNIT_MONTH;
    case 'year':
      return pb.DateTimeUnit.DATE_TIME_UNIT_YEAR;
    default:
      throw new Error(`Unknown date-time unit: ${unit}`);
  }
}

export function multiTopicSelectorFromPb(v: pb.MultiTopicSelector): MultiTopicSelector {
  return {
    type: 'multi-topic-selector',
    topicFqns: v.getTopicFqnsList(),
  };
}

export function multiTopicSelectorToPb(v: MultiTopicSelector): pb.MultiTopicSelector {
  const singleTopicSelectorPb = new pb.MultiTopicSelector();
  singleTopicSelectorPb.setTopicFqnsList(v.topicFqns);
  return singleTopicSelectorPb;
}

export function regexSubscriptionModeFromPb(v: pb.RegexSubscriptionMode): RegexSubscriptionMode {
  switch (v) {
    case pb.RegexSubscriptionMode.REGEX_SUBSCRIPTION_MODE_ALL_TOPICS:
      return 'all-topics';
    case pb.RegexSubscriptionMode.REGEX_SUBSCRIPTION_MODE_PERSISTENT_ONLY:
      return 'persistent-only';
    case pb.RegexSubscriptionMode.REGEX_SUBSCRIPTION_MODE_NON_PERSISTENT_ONLY:
      return 'non-persistent-only';
    default:
      throw new Error(`Unknown regex subscription mode: ${v}`);
  }
}

export function regexSubscriptionModeToPb(v: RegexSubscriptionMode): pb.RegexSubscriptionMode {
  switch (v) {
    case 'all-topics':
      return pb.RegexSubscriptionMode.REGEX_SUBSCRIPTION_MODE_ALL_TOPICS;
    case 'persistent-only':
      return pb.RegexSubscriptionMode.REGEX_SUBSCRIPTION_MODE_PERSISTENT_ONLY;
    case 'non-persistent-only':
      return pb.RegexSubscriptionMode.REGEX_SUBSCRIPTION_MODE_NON_PERSISTENT_ONLY;
    default:
      throw new Error(`Unknown regex subscription mode: ${v}`);
  }
}

export function namespacedRegexTopicSelectorFromPb(v: pb.NamespacedRegexTopicSelector): NamespacedRegexTopicSelector {
  return {
    type: 'namespaced-regex-topic-selector',
    namespaceFqn: v.getNamespaceFqn(),
    pattern: v.getPattern(),
    regexSubscriptionMode: regexSubscriptionModeFromPb(v.getRegexSubscriptionMode()),
  };
}

export function namespacedRegexTopicSelectorToPb(v: NamespacedRegexTopicSelector): pb.NamespacedRegexTopicSelector {
  const selectorPb = new pb.NamespacedRegexTopicSelector();
  selectorPb.setNamespaceFqn(v.namespaceFqn);
  selectorPb.setPattern(v.pattern);
  selectorPb.setRegexSubscriptionMode(regexSubscriptionModeToPb(v.regexSubscriptionMode));
  return selectorPb;
}

export function topicSelectorFromPb(v: pb.TopicSelector): TopicSelector {
  switch (v.getTopicSelectorCase()) {
    case pb.TopicSelector.TopicSelectorCase.MULTI_TOPIC_SELECTOR: {
      return multiTopicSelectorFromPb(v.getMultiTopicSelector()!);
    }
    case pb.TopicSelector.TopicSelectorCase.NAMESPACED_REGEX_TOPIC_SELECTOR: {
      return namespacedRegexTopicSelectorFromPb(v.getNamespacedRegexTopicSelector()!);
    }
    default:
      throw new Error(`Unknown TopicSelector type: ${v}`);
  }
}

export function topicSelectorToPb(v: TopicSelector): pb.TopicSelector {
  const topicSelectorPb = new pb.TopicSelector();

  switch (v.type) {
    case 'multi-topic-selector':
      topicSelectorPb.setMultiTopicSelector(multiTopicSelectorToPb(v));
      break;
    case 'namespaced-regex-topic-selector':
      topicSelectorPb.setNamespacedRegexTopicSelector(namespacedRegexTopicSelectorToPb(v));
      break;
    default:
      throw new Error(`Unknown TopicSelector type: ${v}`);
  }

  return topicSelectorPb;
}

export function startFromFromPb(startFrom: pb.ConsumerSessionStartFrom): ConsumerSessionStartFrom {
  switch (startFrom.getStartFromCase()) {
    case pb.ConsumerSessionStartFrom.StartFromCase.START_FROM_EARLIEST_MESSAGE:
      return { type: 'earliestMessage' };

    case pb.ConsumerSessionStartFrom.StartFromCase.START_FROM_LATEST_MESSAGE:
      return { type: 'latestMessage' };

    case pb.ConsumerSessionStartFrom.StartFromCase.START_FROM_MESSAGE_ID: {
      const byteArray = startFrom.getStartFromMessageId()?.getMessageId_asU8();
      if (byteArray === undefined) {
        throw new Error('Message Id should be defined.');
      }

      return { type: 'messageId', hexString: hexStringFromByteArray(byteArray, 'hex-with-space') };
    }

    case pb.ConsumerSessionStartFrom.StartFromCase.START_FROM_DATE_TIME: {
      const dateTimePb = startFrom.getStartFromDateTime()?.getDateTime();
      if (dateTimePb === undefined) {
        throw new Error('DateTime should be defined.');
      }
      return { type: 'dateTime', dateTime: new Date((dateTimePb.getSeconds() || 0) * 1000) };

    }

    case pb.ConsumerSessionStartFrom.StartFromCase.START_FROM_RELATIVE_DATE_TIME: {
      const relativeDateTimePb = startFrom.getStartFromRelativeDateTime();
      if (relativeDateTimePb === undefined) {
        throw new Error('Relative date-time should be defined.');
      }

      return {
        type: 'relativeDateTime',
        relativeDateTime: {
          unit: dateTimeUnitFromPb(relativeDateTimePb.getUnit()),
          value: relativeDateTimePb.getValue(),
          isRoundedToUnitStart: relativeDateTimePb.getIsRoundedToUnitStart(),
        }
      };
    }

    default:
      throw new Error(`Unknown StartFrom value case. ${startFrom.getStartFromCase()}`);
  }
}

export function coloringRuleFromPb(v: pb.ColoringRule): ColoringRule {
  return {
    isEnabled: v.getIsEnabled(),
    messageFilterChain: messageFilterChainFromPb(v.getMessageFilterChain()!),
    backgroundColor: v.getBackgroundColor(),
    foregroundColor: v.getForegroundColor(),
  }
}

export function coloringRuleToPb(v: ColoringRule): pb.ColoringRule {
  const coloringRulePb = new pb.ColoringRule();
  coloringRulePb.setIsEnabled(v.isEnabled);
  coloringRulePb.setMessageFilterChain(messageFilterChainToPb(v.messageFilterChain));
  coloringRulePb.setBackgroundColor(v.backgroundColor);
  coloringRulePb.setForegroundColor(v.foregroundColor);

  return coloringRulePb;
}

export function coloringRuleChainFromPb(v: pb.ColoringRuleChain): ColoringRuleChain {
  return {
    isEnabled: v.getIsEnabled(),
    coloringRules: v.getColoringRulesList().map(coloringRuleFromPb),
  }
}

export function coloringRuleChainToPb(v: ColoringRuleChain): pb.ColoringRuleChain {
  const coloringRuleChainPb = new pb.ColoringRuleChain();
  coloringRuleChainPb.setIsEnabled(v.isEnabled);
  coloringRuleChainPb.setColoringRulesList(v.coloringRules.map(coloringRuleToPb));

  return coloringRuleChainPb;
}

export function valueProjectionFromPb(v: pb.ValueProjection): ValueProjection {
  return {
    isEnabled: v.getIsEnabled(),
    target: basicMessageFilterTargetFromPb(v.getTargetField()!),
    shortName: v.getShortName(),
    width: v.getWidth()?.getValue()
  }
}

export function valueProjectionToPb(v: ValueProjection): pb.ValueProjection {
  const valueProjectionPb = new pb.ValueProjection();
  valueProjectionPb.setIsEnabled(v.isEnabled);
  valueProjectionPb.setTargetField(basicMessageFilterTargetToPb(v.target));
  valueProjectionPb.setShortName(v.shortName);
  valueProjectionPb.setWidth(v.width === undefined ? undefined : new Int32Value().setValue(v.width));

  return valueProjectionPb;
}

export function valueProjectionListFromPb(v: pb.ValueProjectionList): ValueProjectionList {
  return {
    isEnabled: v.getIsEnabled(),
    projections: v.getProjectionsList().map(valueProjectionFromPb)
  }
}

export function valueProjectionListToPb(v: ValueProjectionList): pb.ValueProjectionList {
  const valueProjectionListPb = new pb.ValueProjectionList();
  valueProjectionListPb.setIsEnabled(v.isEnabled);
  valueProjectionListPb.setProjectionsList(v.projections.map(valueProjectionToPb));

  return valueProjectionListPb;
}

export function jsMessageFilterFromPb(v: pb.JsMessageFilter): JsMessageFilter {
  return {
    type: "JsMessageFilter",
    jsCode: v.getJsCode()
  }
}

export function jsMessageFilterToPb(v: JsMessageFilter): pb.JsMessageFilter {
  const resultPb = new pb.JsMessageFilter();
  resultPb.setJsCode(v.jsCode);

  return resultPb;
}

export function messageFilterToPb(filter: MessageFilter): pb.MessageFilter {
  const messageFilterPb = new pb.MessageFilter();
  messageFilterPb.setTargetField(basicMessageFilterTargetToPb(filter.targetField));
  messageFilterPb.setIsEnabled(filter.isEnabled);
  messageFilterPb.setIsNegated(filter.isNegated);

  switch (filter.filter.type) {
    case "JsMessageFilter": {
      messageFilterPb.setFilterJs(jsMessageFilterToPb(filter.filter));
      break;
    }

    case "BasicMessageFilter": {
      messageFilterPb.setFilterBasic(basicMessageFilterToPb(filter.filter));
      break;
    }
  }

  return messageFilterPb;
}

export function messageFilterChainModeFromPb(mode: pb.MessageFilterChainMode): MessageFilterChainMode {
  switch (mode) {
    case pb.MessageFilterChainMode.MESSAGE_FILTER_CHAIN_MODE_ALL:
      return 'all';
    case pb.MessageFilterChainMode.MESSAGE_FILTER_CHAIN_MODE_ANY:
      return 'any';
    default:
      throw new Error(`Unknown MessageFilterChainMode: ${mode}`);
  }
}

export function messageFilterChainModeToPb(mode: MessageFilterChainMode): pb.MessageFilterChainMode {
  switch (mode) {
    case 'all':
      return pb.MessageFilterChainMode.MESSAGE_FILTER_CHAIN_MODE_ALL;
    case 'any':
      return pb.MessageFilterChainMode.MESSAGE_FILTER_CHAIN_MODE_ANY;
    default:
      throw new Error(`Unknown MessageFilterChainMode: ${mode}`);
  }
}

export function messageFilterFromPb(filter: pb.MessageFilter): MessageFilter {
  switch (filter.getFilterCase()) {
    case pb.MessageFilter.FilterCase.FILTER_JS:
      return {
        type: 'MessageFilter',
        isEnabled: filter.getIsEnabled(),
        isNegated: filter.getIsNegated(),
        targetField: basicMessageFilterTargetFromPb(filter.getTargetField()!),
        filter: { type: "JsMessageFilter", jsCode: filter.getFilterJs()?.getJsCode() ?? '' },
      };
    case pb.MessageFilter.FilterCase.FILTER_BASIC: {
      return {
        type: 'MessageFilter',
        isEnabled: filter.getIsEnabled(),
        isNegated: filter.getIsNegated(),
        targetField: basicMessageFilterTargetFromPb(filter.getTargetField()!),
        filter: basicMessageFilterFromPb(filter.getFilterBasic()!),
      };
    }
    default:
      throw new Error(`Unknown MessageFilter value case. ${filter.getFilterBasic()}`);
  }
}

export function messageFilterChainFromPb(filterChain: pb.MessageFilterChain): MessageFilterChain {
  return {
    mode: messageFilterChainModeFromPb(filterChain.getMode()),
    isEnabled: filterChain.getIsEnabled(),
    isNegated: filterChain.getIsNegated(),
    filters: filterChain.getFiltersList().map(messageFilterFromPb),
  };
}

export function messageFilterChainToPb(chain: MessageFilterChain): pb.MessageFilterChain {
  const chainPb = new pb.MessageFilterChain();
  chainPb.setMode(messageFilterChainModeToPb(chain.mode));

  chainPb.setIsEnabled(chain.isEnabled);
  chainPb.setIsNegated(chain.isNegated);

  const messageFiltersPb = chain.filters.map(messageFilterToPb);
  chainPb.setFiltersList(messageFiltersPb);

  return chainPb;
}

export function messageIdFromPb(v: pb.MessageId): MessageId {
  return {
    messageId: v.getMessageId_asU8(),
  };
}

export function messageIdToPb(v: MessageId): pb.MessageId {
  const messageIdPb = new pb.MessageId();
  messageIdPb.setMessageId(v.messageId);

  return messageIdPb;
}

export function consumerSessionEventMessagesProcessedFromPb(v: pb.ConsumerSessionEventMessagesProcessed): ConsumerSessionEventMessagesProcessed {
  return {
    type: 'messages-processed',
    messageCount: v.getMessageCount(),
  };
}

export function consumerSessionEventMessagesProcessedToPb(v: ConsumerSessionEventMessagesProcessed): pb.ConsumerSessionEventMessagesProcessed {
  const messagesProcessedPb = new pb.ConsumerSessionEventMessagesProcessed();
  messagesProcessedPb.setMessageCount(v.messageCount);

  return messagesProcessedPb;
}

export function consumerSessionEventMessagesDeliveredFromPb(v: pb.ConsumerSessionEventMessagesDelivered): ConsumerSessionEventMessagesDelivered {
  return {
    type: 'messages-delivered',
    messageCount: v.getMessageCount(),
  };
}

export function consumerSessionEventMessagesDeliveredToPb(v: ConsumerSessionEventMessagesDelivered): pb.ConsumerSessionEventMessagesDelivered {
  const messagesDeliveredPb = new pb.ConsumerSessionEventMessagesDelivered();
  messagesDeliveredPb.setMessageCount(v.messageCount);

  return messagesDeliveredPb;
}

export function consumerSessionEventBytesProcessedFromPb(v: pb.ConsumerSessionEventBytesProcessed): ConsumerSessionEventMessagesProcessed {
  return {
    type: 'messages-processed',
    messageCount: v.getByteCount(),
  };
}

export function consumerSessionEventBytesProcessedToPb(v: ConsumerSessionEventBytesProcessed): pb.ConsumerSessionEventBytesProcessed {
  const bytesProcessedPb = new pb.ConsumerSessionEventBytesProcessed();
  bytesProcessedPb.setByteCount(v.byteCount);

  return bytesProcessedPb;
}

export function consumerSessionEventBytesDeliveredFromPb(v: pb.ConsumerSessionEventBytesDelivered): ConsumerSessionEventBytesDelivered {
  return {
    type: 'bytes-delivered',
    byteCount: v.getByteCount(),
  };
}

export function consumerSessionEventBytesDeliveredToPb(v: ConsumerSessionEventBytesDelivered): pb.ConsumerSessionEventBytesDelivered {
  const bytesDeliveredPb = new pb.ConsumerSessionEventBytesDelivered();
  bytesDeliveredPb.setByteCount(v.byteCount);

  return bytesDeliveredPb;
}

export function consumerSessionEventMessageDecodeFailedFromPb(v: pb.ConsumerSessionEventMessageDecodeFailed): ConsumerSessionEventMessageDecodeFailed {
  return {
    type: 'decode-failed',
    failCount: v.getFailCount(),
  };
}

export function consumerSessionEventMessageDecodeFailedToPb(v: ConsumerSessionEventMessageDecodeFailed): pb.ConsumerSessionEventMessageDecodeFailed {
  const messageDecodeFailedPb = new pb.ConsumerSessionEventMessageDecodeFailed();
  messageDecodeFailedPb.setFailCount(v.failCount);

  return messageDecodeFailedPb;
}

export function consumerSessionEventTimeElapsedFromPb(v: pb.ConsumerSessionEventTimeElapsed): ConsumerSessionEventTimeElapsed {
  return {
    type: 'time-elapsed',
    timeElapsedMs: v.getTimeElapsedMs(),
  };
}

export function consumerSessionEventTimeElapsedToPb(v: ConsumerSessionEventTimeElapsed): pb.ConsumerSessionEventTimeElapsed {
  const timeElapsedPb = new pb.ConsumerSessionEventTimeElapsed();
  timeElapsedPb.setTimeElapsedMs(v.timeElapsedMs);

  return timeElapsedPb;
}

export function consumerSessionEventTopicEndReachedFromPb(v: pb.ConsumerSessionEventTopicEndReached): ConsumerSessionEventTopicEndReached {
  return {
    type: 'topic-end-reached',
  };
}

export function consumerSessionEventTopicEndReachedToPb(v: ConsumerSessionEventTopicEndReached): pb.ConsumerSessionEventTopicEndReached {
  return new pb.ConsumerSessionEventTopicEndReached();
}

export function consumerSessionEventUnexpectedErrorOccurredFromPb(v: pb.ConsumerSessionEventUnexpectedErrorOccurred): ConsumerSessionEventUnexpectedErrorOccurred {
  return {
    type: 'unexpected-error-occurred',
  };
}

export function consumerSessionEventUnexpectedErrorOccurredToPb(v: ConsumerSessionEventUnexpectedErrorOccurred): pb.ConsumerSessionEventUnexpectedErrorOccurred {
  return new pb.ConsumerSessionEventUnexpectedErrorOccurred();
}

export function consumerSessionEventMessageIdFromPb(v: pb.ConsumerSessionEventMessageId): ConsumerSessionEventMessageId {
  return {
    type: 'message-id',
    messageId: messageIdFromPb(v.getMessageId()!),
  };
}

export function consumerSessionEventMessageIdToPb(v: ConsumerSessionEventMessageId): pb.ConsumerSessionEventMessageId {
  const messageIdPb = new pb.ConsumerSessionEventMessageId();
  messageIdPb.setMessageId(messageIdToPb(v.messageId));

  return messageIdPb;
}

export function consumerSessionEventFromPb(v: pb.ConsumerSessionEvent): ConsumerSessionEvent {
  switch (v.getEventCase()) {
    case pb.ConsumerSessionEvent.EventCase.EVENT_MESSAGES_PROCESSED:
      return consumerSessionEventMessagesProcessedFromPb(v.getEventMessagesProcessed()!);
    case pb.ConsumerSessionEvent.EventCase.EVENT_MESSAGES_DELIVERED:
      return consumerSessionEventMessagesDeliveredFromPb(v.getEventMessagesDelivered()!);
    case pb.ConsumerSessionEvent.EventCase.EVENT_BYTES_PROCESSED:
      return consumerSessionEventBytesProcessedFromPb(v.getEventBytesProcessed()!);
    case pb.ConsumerSessionEvent.EventCase.EVENT_BYTES_DELIVERED:
      return consumerSessionEventBytesDeliveredFromPb(v.getEventBytesDelivered()!);
    case pb.ConsumerSessionEvent.EventCase.EVENT_MESSAGE_DECODE_FAILED:
      return consumerSessionEventMessageDecodeFailedFromPb(v.getEventMessageDecodeFailed()!);
    case pb.ConsumerSessionEvent.EventCase.EVENT_TIME_ELAPSED:
      return consumerSessionEventTimeElapsedFromPb(v.getEventTimeElapsed()!);
    case pb.ConsumerSessionEvent.EventCase.EVENT_TOPIC_END_REACHED:
      return consumerSessionEventTopicEndReachedFromPb(v.getEventTopicEndReached()!);
    case pb.ConsumerSessionEvent.EventCase.EVENT_UNEXPECTED_ERROR_OCCURRED:
      return consumerSessionEventUnexpectedErrorOccurredFromPb(v.getEventUnexpectedErrorOccurred()!);
    case pb.ConsumerSessionEvent.EventCase.EVENT_MESSAGE_ID:
      return consumerSessionEventMessageIdFromPb(v.getEventMessageId()!);
    default:
      throw new Error(`Unknown ConsumerSessionEvent type: ${v}`);
  }
}

export function consumerSessionEventToPb(v: ConsumerSessionEvent): pb.ConsumerSessionEvent {
  const consumerSessionEventPb = new pb.ConsumerSessionEvent();

  switch (v.type) {
    case 'messages-processed':
      consumerSessionEventPb.setEventMessagesProcessed(consumerSessionEventMessagesProcessedToPb(v));
      break;
    case 'messages-delivered':
      consumerSessionEventPb.setEventMessagesDelivered(consumerSessionEventMessagesDeliveredToPb(v));
      break;
    case 'bytes-processed':
      consumerSessionEventPb.setEventBytesProcessed(consumerSessionEventBytesProcessedToPb(v));
      break;
    case 'bytes-delivered':
      consumerSessionEventPb.setEventBytesDelivered(consumerSessionEventBytesDeliveredToPb(v));
      break;
    case 'decode-failed':
      consumerSessionEventPb.setEventMessageDecodeFailed(consumerSessionEventMessageDecodeFailedToPb(v));
      break;
    case 'time-elapsed':
      consumerSessionEventPb.setEventTimeElapsed(consumerSessionEventTimeElapsedToPb(v));
      break;
    case 'topic-end-reached':
      consumerSessionEventPb.setEventTopicEndReached(consumerSessionEventTopicEndReachedToPb(v));
      break;
    case 'unexpected-error-occurred':
      consumerSessionEventPb.setEventUnexpectedErrorOccurred(consumerSessionEventUnexpectedErrorOccurredToPb(v));
      break;
    case 'message-id':
      consumerSessionEventPb.setEventMessageId(consumerSessionEventMessageIdToPb(v));
      break;
    default:
      throw new Error(`Unknown ConsumerSessionEvent type: ${v}`);
  }

  return consumerSessionEventPb;
}

export function consumerSessionPauseTriggerChainModeFromPb(v: pb.ConsumerSessionPauseTriggerChainMode): ConsumerSessionPauseTriggerChainMode {
  switch (v) {
    case pb.ConsumerSessionPauseTriggerChainMode.CONSUMER_SESSION_PAUSE_TRIGGER_CHAIN_MODE_ALL:
      return 'all';
    case pb.ConsumerSessionPauseTriggerChainMode.CONSUMER_SESSION_PAUSE_TRIGGER_CHAIN_MODE_ANY:
      return 'any';
    default:
      throw new Error(`Unknown ConsumerSessionPauseTriggerChainMode: ${v}`);
  }
}

export function consumerSessionPauseTriggerChainModeToPb(v: ConsumerSessionPauseTriggerChainMode): pb.ConsumerSessionPauseTriggerChainMode {
  switch (v) {
    case 'all':
      return pb.ConsumerSessionPauseTriggerChainMode.CONSUMER_SESSION_PAUSE_TRIGGER_CHAIN_MODE_ALL;
    case 'any':
      return pb.ConsumerSessionPauseTriggerChainMode.CONSUMER_SESSION_PAUSE_TRIGGER_CHAIN_MODE_ANY;
    default:
      throw new Error(`Unknown ConsumerSessionPauseTriggerChainMode: ${v}`);
  }
}

export function consumerSessionPauseTriggerChainFromPb(v: pb.ConsumerSessionPauseTriggerChain): ConsumerSessionPauseTriggerChain {
  return {
    events: v.getEventsList().map(consumerSessionEventFromPb),
    mode: consumerSessionPauseTriggerChainModeFromPb(v.getMode()),
  };
}

export function consumerSessionPauseTriggerChainToPb(v: ConsumerSessionPauseTriggerChain): pb.ConsumerSessionPauseTriggerChain {
  const consumerSessionPauseTriggerChainPb = new pb.ConsumerSessionPauseTriggerChain();
  consumerSessionPauseTriggerChainPb.setMode(consumerSessionPauseTriggerChainModeToPb(v.mode));
  consumerSessionPauseTriggerChainPb.setEventsList(v.events.map(consumerSessionEventToPb));

  return consumerSessionPauseTriggerChainPb;
}

export function consumerSessionTargetFromPb(v: pb.ConsumerSessionTarget): ConsumerSessionTarget {
  return {
    topicSelector: topicSelectorFromPb(v.getTopicSelector()!),
    messageFilterChain: messageFilterChainFromPb(v.getMessageFilterChain()!),
    coloringRuleChain: coloringRuleChainFromPb(v.getColoringRuleChain()!),
    valueProjectionList: valueProjectionListFromPb(v.getValueProjectionList()!)
  };
}

export function consumerSessionTargetToPb(v: ConsumerSessionTarget): pb.ConsumerSessionTarget {
  const consumerSessionTargetPb = new pb.ConsumerSessionTarget();
  consumerSessionTargetPb.setTopicSelector(topicSelectorToPb(v.topicSelector));
  consumerSessionTargetPb.setMessageFilterChain(messageFilterChainToPb(v.messageFilterChain));
  consumerSessionTargetPb.setColoringRuleChain(coloringRuleChainToPb(v.coloringRuleChain));
  consumerSessionTargetPb.setValueProjectionList(valueProjectionListToPb(v.valueProjectionList));

  return consumerSessionTargetPb;
}

function startFromToPb(startFrom: ConsumerSessionStartFrom): pb.ConsumerSessionStartFrom {
  const startFromPb = new pb.ConsumerSessionStartFrom();

  switch (startFrom.type) {
    case 'earliestMessage':
      startFromPb.setStartFromEarliestMessage(new pb.EarliestMessage());
      break;
    case 'latestMessage':
      startFromPb.setStartFromLatestMessage(new pb.LatestMessage());
      break;
    case 'nthMessageAfterEarliest':
      startFromPb.setStartFromNthMessageAfterEarliest(new pb.NthMessageAfterEarliest().setN(startFrom.n));
      break;
    case 'nthMessageBeforeLatest':
      startFromPb.setStartFromNthMessageBeforeLatest(new pb.NthMessageBeforeLatest().setN(startFrom.n));
      break;
    case 'messageId':
      startFromPb.setStartFromMessageId(new pb.MessageId().setMessageId(hexStringToByteArray(startFrom.hexString)));
      break;
    case 'dateTime':
      const epochSeconds = Math.floor(startFrom.dateTime.getTime() / 1000);
      const timestampPb = new Timestamp();
      timestampPb.setSeconds(epochSeconds);
      startFromPb.setStartFromDateTime(new pb.DateTime().setDateTime(timestampPb));
      break;
    case 'relativeDateTime':
      const relativeDateTimePb = new pb.RelativeDateTime();
      relativeDateTimePb.setUnit(dateTimeUnitToPb(startFrom.relativeDateTime.unit))
      relativeDateTimePb.setValue(startFrom.relativeDateTime.value)
      relativeDateTimePb.setIsRoundedToUnitStart(startFrom.relativeDateTime.isRoundedToUnitStart)

      startFromPb.setStartFromRelativeDateTime(relativeDateTimePb);
      break;
    default:
      throw new Error(`Unknown StartFrom type. ${startFrom}`);
  }

  return startFromPb;
}

export function consumerSessionConfigToPb(config: ConsumerSessionConfig): pb.ConsumerSessionConfig {
  const startFromPb = startFromToPb(config.startFrom);
  const targetsPb = config.targets.map(consumerSessionTargetToPb);
  const messageFilterChainPb = messageFilterChainToPb(config.messageFilterChain);
  const pauseTriggerChainPb = consumerSessionPauseTriggerChainToPb(config.pauseTriggerChain);
  const coloringRuleChainPb = coloringRuleChainToPb(config.coloringRuleChain);
  const valueProjectionListPb = valueProjectionListToPb(config.valueProjectionList);

  const configPb = new pb.ConsumerSessionConfig();
  configPb.setStartFrom(startFromPb);
  configPb.setTargetsList(targetsPb);
  configPb.setMessageFilterChain(messageFilterChainPb);
  configPb.setPauseTriggerChain(pauseTriggerChainPb);
  configPb.setColoringRuleChain(coloringRuleChainPb);
  configPb.setValueProjectionList(valueProjectionListPb);

  return configPb;
}

export function testResultFromPb(v: pb.TestResult): TestResult {
  return {
    isOk: v.getIsOk(),
    error: v.getError()?.getValue()
  };
}

export function testResultToPb(v: TestResult): pb.TestResult {
  const resultPb = new pb.TestResult();
  resultPb.setIsOk(v.isOk);

  if (v.error !== undefined) {
    const errorPb = new StringValue();
    errorPb.setValue(v.error);
  }

  return resultPb;
}

export function chainTestResultFromPb(v: pb.ChainTestResult): ChainTestResult {
  return {
    isOk: v.getIsOk(),
    results: v.getResultsList().map(testResultFromPb)
  }
}

export function chainTestResultToPb(v: ChainTestResult): pb.ChainTestResult {
  const resultPb = new pb.ChainTestResult();
  resultPb.setIsOk(v.isOk);

  const resultsPb = v.results.map(testResultToPb);
  resultPb.setResultsList(resultsPb);

  return resultPb;
}

export function valueProjectionResultFromPb(v: pb.ValueProjectionResult): ValueProjectionResult {
  return {
    displayValue: v.getDisplayValue()?.getValue()
  }
}

export function valueProjectionResultToPb(v: ValueProjectionResult): pb.ValueProjectionResult {
  const resultPb = new pb.ValueProjectionResult();
  if (v.displayValue !== undefined) {
    resultPb.setDisplayValue(new StringValue().setValue(v.displayValue));
  }
  return resultPb;
}

