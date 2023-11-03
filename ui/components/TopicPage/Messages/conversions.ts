import { Timestamp } from "google-protobuf/google/protobuf/timestamp_pb";
import * as pb from "../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb";
import { hexStringFromByteArray, hexStringToByteArray } from "../../conversions/conversions";
import {
  MessageDescriptor,
  PartialMessageDescriptor,
  ConsumerSessionConfig,
  BasicMessageFilter,
  JsMessageFilter,
  MessageFilter,
  MessageFilterChain,
  MessageFilterChainMode,
  ConsumerSessionStartFrom,
  DateTimeUnit,
  TopicsSelector,
  TopicsSelectorByFqns,
  TopicsSelectorByRegex,
  RegexSubMode,
} from "./types";

export function messageDescriptorFromPb(message: pb.Message): MessageDescriptor {
  const propertiesMap = Object.fromEntries(message.getPropertiesMap().toArray());

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
    accum: message.getAccumulator()?.getValue() ?? null,
    debugStdout: message.getDebugStdout()?.getValue() ?? null,
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

  let accum: undefined | null | any;
  if (message.accum !== undefined && message.accum !== null) {
    accum = JSON.parse(message.accum);
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
    accum,
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

export function topicsSelectorByFqnsFromPb(v: pb.TopicsSelectorByFqns): TopicsSelectorByFqns {
  return {
    type: 'by-fqns',
    topicFqns: v.getTopicFqnsList(),
  };
}

export function topicsSelectorByFqnsToPb(v: TopicsSelectorByFqns): pb.TopicsSelectorByFqns {
  const topicsSelectorByFqnsPb = new pb.TopicsSelectorByFqns();
  topicsSelectorByFqnsPb.setTopicFqnsList(v.topicFqns);
  return topicsSelectorByFqnsPb;
}



export function regexSubscriptionModeFromPb(v: pb.RegexSubscriptionMode): RegexSubMode {
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

export function regexSubscriptionModeToPb(v: RegexSubMode): pb.RegexSubscriptionMode {
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

export function topicsSelectorByRegexFromPb(v: pb.TopicsSelectorByRegex): TopicsSelectorByRegex {
  return {
    type: 'by-regex',
    pattern: v.getPattern(),
    regexSubscriptionMode: regexSubscriptionModeFromPb(v.getRegexSubscriptionMode()),
  };
}

export function topicsSelectorByRegexToPb(v: TopicsSelectorByRegex): pb.TopicsSelectorByRegex {
  const topicsSelectorByRegexPb = new pb.TopicsSelectorByRegex();
  topicsSelectorByRegexPb.setPattern(v.pattern);
  topicsSelectorByRegexPb.setRegexSubscriptionMode(regexSubscriptionModeToPb(v.regexSubscriptionMode));
  return topicsSelectorByRegexPb;
}

export function topicsSelectorFromPb(v: pb.TopicsSelector): TopicsSelector {
  switch (v.getTopicsSelectorCase()) {
    case pb.TopicsSelector.TopicsSelectorCase.TOPICS_SELECTOR_BY_FQNS: {
      return topicsSelectorByFqnsFromPb(v.getTopicsSelectorByFqns()!);
    }
    case pb.TopicsSelector.TopicsSelectorCase.TOPICS_SELECTOR_BY_REGEX: {
      return topicsSelectorByRegexFromPb(v.getTopicsSelectorByRegex()!);
    }
    default:
      throw new Error(`Unknown topics selector type: ${v}`);
  }
}

export function topicsSelectorToPb(v: TopicsSelector): pb.TopicsSelector {
  const topicsSelectorPb = new pb.TopicsSelector();

  switch (v.type) {
    case 'by-fqns':
      topicsSelectorPb.setTopicsSelectorByFqns(topicsSelectorByFqnsToPb(v));
      break;
    case 'by-regex':
      topicsSelectorPb.setTopicsSelectorByRegex(topicsSelectorByRegexToPb(v));
      break;
    default:
      throw new Error(`Unknown topics selector type: ${v}`);
  }

  return topicsSelectorPb;
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
  const topicsSelectorPb = topicsSelectorToPb(config.topicsSelector);
  const startFromPb = startFromToPb(config.startFrom);
  const messageFilterChainPb = messageFilterChainToPb(config.messageFilterChain);

  const configPb = new pb.ConsumerSessionConfig();
  configPb.setStartFrom(startFromPb);
  configPb.setMessageFilterChain(messageFilterChainPb);
  configPb.setTopicsSelector(topicsSelectorPb);

  return configPb;
}

export function messageFilterToPb(filter: MessageFilter): pb.MessageFilter {
  switch (filter.type) {
    case "js-message-filter": {
      const jsMessageFilterPb = new pb.JsMessageFilter();
      jsMessageFilterPb.setJsCode(filter.value.jsCode);

      const messageFilterPb = new pb.MessageFilter();
      messageFilterPb.setJs(jsMessageFilterPb)

      messageFilterPb.setIsEnabled(filter.isEnabled);
      messageFilterPb.setIsNegated(filter.isNegated);

      return messageFilterPb;
    }

    case "basic-message-filter": {
      const basicMessageFilterPb = new pb.BasicMessageFilter();

      const messageFilterPb = new pb.MessageFilter();
      messageFilterPb.setBasic(basicMessageFilterPb)

      messageFilterPb.setIsEnabled(filter.isEnabled);
      messageFilterPb.setIsNegated(filter.isNegated);

      return messageFilterPb;

    }
  }
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
  switch (filter.getValueCase()) {
    case pb.MessageFilter.ValueCase.JS:
      return {
        type: 'js-message-filter',
        value: { jsCode: filter.getJs()?.getJsCode() ?? '' },
        isEnabled: filter.getIsEnabled(),
        isNegated: filter.getIsNegated(),
      };
    case pb.MessageFilter.ValueCase.BASIC: {
      return {
        type: 'basic-message-filter',
        value: {},
        isEnabled: filter.getIsEnabled(),
        isNegated: filter.getIsNegated(),
      };
    }
    default:
      throw new Error(`Unknown MessageFilter value case. ${filter.getValueCase()}`);
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
