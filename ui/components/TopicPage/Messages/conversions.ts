import {Timestamp} from "google-protobuf/google/protobuf/timestamp_pb";
import * as pb from "../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb";
import {BasicMessageFilterTarget} from "../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb";
import {hexStringFromByteArray, hexStringToByteArray} from "../../conversions/conversions";
import {
  MessageDescriptor,
  PartialMessageDescriptor,
  ConsumerSessionConfig,
  MessageFilter,
  MessageFilterChain,
  MessageFilterChainMode,
  ConsumerSessionStartFrom,
  DateTimeUnit,
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
  const startFromPb = startFromToPb(config.startFrom);
  const messageFilterChainPb = messageFilterChainToPb(config.messageFilterChain);

  const configPb = new pb.ConsumerSessionConfig();
  configPb.setStartFrom(startFromPb);
  configPb.setMessageFilterChain(messageFilterChainPb);

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
    case "basic-message-filter-contains": {
      const basicMessageFilterPb = new pb.BasicMessageFilter();
      const containsOperationPb = new pb.BasicMessageFilterOperationContains();
      containsOperationPb.setValue(filter.value.value ?? '');
      containsOperationPb.setIsCaseSensitive(filter.value.isCaseSensitive ?? false);

      filter.value.target === 'key' && basicMessageFilterPb.setTarget(BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_KEY)
      filter.value.target === 'value' && basicMessageFilterPb.setTarget(BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_VALUE)
      filter.value.target === 'properties' && basicMessageFilterPb.setTarget(BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_PROPERTIES)
      filter.value.target === 'accum' && basicMessageFilterPb.setTarget(BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_ACCUM)

      basicMessageFilterPb.setContains(containsOperationPb);

      const messageFilterPb = new pb.MessageFilter();
      messageFilterPb.setBasic(basicMessageFilterPb)

      messageFilterPb.setIsEnabled(filter.isEnabled);
      messageFilterPb.setIsNegated(filter.isNegated);

      return messageFilterPb;
    }
    case "basic-message-filter-end-with": {
      const basicMessageFilterPb = new pb.BasicMessageFilter();
      const endWithOperationPb = new pb.BasicMessageFilterOperationEndsWith();
      endWithOperationPb.setValue(filter.value.value ?? '');
      endWithOperationPb.setIsCaseSensitive(filter.value.isCaseSensitive ?? false);

      filter.value.target === 'key' && basicMessageFilterPb.setTarget(BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_KEY)
      filter.value.target === 'value' && basicMessageFilterPb.setTarget(BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_VALUE)
      filter.value.target === 'properties' && basicMessageFilterPb.setTarget(BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_PROPERTIES)
      filter.value.target === 'accum' && basicMessageFilterPb.setTarget(BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_ACCUM)

      basicMessageFilterPb.setEndsWith(endWithOperationPb);

      const messageFilterPb = new pb.MessageFilter();
      messageFilterPb.setBasic(basicMessageFilterPb)

      messageFilterPb.setIsEnabled(filter.isEnabled);
      messageFilterPb.setIsNegated(filter.isNegated);

      return messageFilterPb;
    }
    case "basic-message-filter-equals": {
      const basicMessageFilterPb = new pb.BasicMessageFilter();
      const equalsOperationPb = new pb.BasicMessageFilterOperationEquals();
      equalsOperationPb.setValue(filter.value.value ?? '');
      equalsOperationPb.setIsCaseSensitive(filter.value.isCaseSensitive ?? false);

      filter.value.target === 'key' && basicMessageFilterPb.setTarget(BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_KEY)
      filter.value.target === 'value' && basicMessageFilterPb.setTarget(BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_VALUE)
      filter.value.target === 'properties' && basicMessageFilterPb.setTarget(BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_PROPERTIES)
      filter.value.target === 'accum' && basicMessageFilterPb.setTarget(BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_ACCUM)

      basicMessageFilterPb.setEquals(equalsOperationPb);

      const messageFilterPb = new pb.MessageFilter();
      messageFilterPb.setBasic(basicMessageFilterPb)

      messageFilterPb.setIsEnabled(filter.isEnabled);
      messageFilterPb.setIsNegated(filter.isNegated);

      return messageFilterPb;
    }
    case "basic-message-filter-greater-than": {
      const basicMessageFilterPb = new pb.BasicMessageFilter();
      const greaterThanOperationPb = new pb.BasicMessageFilterOperationGreaterThan();
      greaterThanOperationPb.setValue(filter.value.value ?? '');

      filter.value.target === 'key' && basicMessageFilterPb.setTarget(BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_KEY)
      filter.value.target === 'value' && basicMessageFilterPb.setTarget(BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_VALUE)
      filter.value.target === 'properties' && basicMessageFilterPb.setTarget(BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_PROPERTIES)
      filter.value.target === 'accum' && basicMessageFilterPb.setTarget(BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_ACCUM)

      basicMessageFilterPb.setGreaterThan(greaterThanOperationPb);

      const messageFilterPb = new pb.MessageFilter();
      messageFilterPb.setBasic(basicMessageFilterPb)

      messageFilterPb.setIsEnabled(filter.isEnabled);
      messageFilterPb.setIsNegated(filter.isNegated);

      return messageFilterPb;
    }
    case "basic-message-filter-greater-than-or-equals": {
      const basicMessageFilterPb = new pb.BasicMessageFilter();
      const greaterThanOrEqualOperationPb = new pb.BasicMessageFilterOperationGreaterThanOrEquals();
      greaterThanOrEqualOperationPb.setValue(filter.value.value ?? '');

      filter.value.target === 'key' && basicMessageFilterPb.setTarget(BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_KEY)
      filter.value.target === 'value' && basicMessageFilterPb.setTarget(BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_VALUE)
      filter.value.target === 'properties' && basicMessageFilterPb.setTarget(BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_PROPERTIES)
      filter.value.target === 'accum' && basicMessageFilterPb.setTarget(BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_ACCUM)

      basicMessageFilterPb.setGreaterThanOrEquals(greaterThanOrEqualOperationPb);

      const messageFilterPb = new pb.MessageFilter();
      messageFilterPb.setBasic(basicMessageFilterPb)

      messageFilterPb.setIsEnabled(filter.isEnabled);
      messageFilterPb.setIsNegated(filter.isNegated);

      return messageFilterPb;
    }
    case "basic-message-filter-is-null": {
      const basicMessageFilterPb = new pb.BasicMessageFilter();
      const isNullOperationPb = new pb.BasicMessageFilterOperationIsNull();

      filter.value.target === 'key' && basicMessageFilterPb.setTarget(BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_KEY)
      filter.value.target === 'value' && basicMessageFilterPb.setTarget(BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_VALUE)
      filter.value.target === 'properties' && basicMessageFilterPb.setTarget(BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_PROPERTIES)
      filter.value.target === 'accum' && basicMessageFilterPb.setTarget(BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_ACCUM)

      basicMessageFilterPb.setIsNull(isNullOperationPb);

      const messageFilterPb = new pb.MessageFilter();
      messageFilterPb.setBasic(basicMessageFilterPb)

      messageFilterPb.setIsEnabled(filter.isEnabled);
      messageFilterPb.setIsNegated(filter.isNegated);

      return messageFilterPb;
    }
    case "basic-message-filter-is-truthy": {
      const basicMessageFilterPb = new pb.BasicMessageFilter();
      const isTruthyOperationPb = new pb.BasicMessageFilterOperationIsTruthy();

      filter.value.target === 'key' && basicMessageFilterPb.setTarget(BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_KEY)
      filter.value.target === 'value' && basicMessageFilterPb.setTarget(BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_VALUE)
      filter.value.target === 'properties' && basicMessageFilterPb.setTarget(BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_PROPERTIES)
      filter.value.target === 'accum' && basicMessageFilterPb.setTarget(BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_ACCUM)

      basicMessageFilterPb.setIsTruthy(isTruthyOperationPb);

      const messageFilterPb = new pb.MessageFilter();
      messageFilterPb.setBasic(basicMessageFilterPb)

      messageFilterPb.setIsEnabled(filter.isEnabled);
      messageFilterPb.setIsNegated(filter.isNegated);

      return messageFilterPb;
    }
    case "basic-message-filter-less-than": {
      const basicMessageFilterPb = new pb.BasicMessageFilter();
      const lessThanOperationPb = new pb.BasicMessageFilterOperationLessThan();
      lessThanOperationPb.setValue(filter.value.value ?? '');

      filter.value.target === 'key' && basicMessageFilterPb.setTarget(BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_KEY)
      filter.value.target === 'value' && basicMessageFilterPb.setTarget(BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_VALUE)
      filter.value.target === 'properties' && basicMessageFilterPb.setTarget(BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_PROPERTIES)
      filter.value.target === 'accum' && basicMessageFilterPb.setTarget(BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_ACCUM)

      basicMessageFilterPb.setLessThan(lessThanOperationPb);

      const messageFilterPb = new pb.MessageFilter();
      messageFilterPb.setBasic(basicMessageFilterPb)

      messageFilterPb.setIsEnabled(filter.isEnabled);
      messageFilterPb.setIsNegated(filter.isNegated);

      return messageFilterPb;
    }
    case "basic-message-filter-less-than-or-equals": {
      const basicMessageFilterPb = new pb.BasicMessageFilter();
      const lessThanOrEqualsOperationPb = new pb.BasicMessageFilterOperationLessThanOrEquals();
      lessThanOrEqualsOperationPb.setValue(filter.value.value ?? '');

      filter.value.target === 'key' && basicMessageFilterPb.setTarget(BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_KEY)
      filter.value.target === 'value' && basicMessageFilterPb.setTarget(BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_VALUE)
      filter.value.target === 'properties' && basicMessageFilterPb.setTarget(BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_PROPERTIES)
      filter.value.target === 'accum' && basicMessageFilterPb.setTarget(BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_ACCUM)

      basicMessageFilterPb.setLessThanOrEquals(lessThanOrEqualsOperationPb);

      const messageFilterPb = new pb.MessageFilter();
      messageFilterPb.setBasic(basicMessageFilterPb)

      messageFilterPb.setIsEnabled(filter.isEnabled);
      messageFilterPb.setIsNegated(filter.isNegated);

      return messageFilterPb;
    }
    case "basic-message-filter-regex": {
      const basicMessageFilterPb = new pb.BasicMessageFilter();
      const regexOperationPb = new pb.BasicMessageFilterOperationRegex();
      regexOperationPb.setValue(filter.value.value ?? '');

      filter.value.target === 'key' && basicMessageFilterPb.setTarget(BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_KEY)
      filter.value.target === 'value' && basicMessageFilterPb.setTarget(BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_VALUE)
      filter.value.target === 'properties' && basicMessageFilterPb.setTarget(BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_PROPERTIES)
      filter.value.target === 'accum' && basicMessageFilterPb.setTarget(BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_ACCUM)

      basicMessageFilterPb.setRegex(regexOperationPb);

      const messageFilterPb = new pb.MessageFilter();
      messageFilterPb.setBasic(basicMessageFilterPb)

      messageFilterPb.setIsEnabled(filter.isEnabled);
      messageFilterPb.setIsNegated(filter.isNegated);

      return messageFilterPb;
    }
    case "basic-message-filter-starts-with": {
      const basicMessageFilterPb = new pb.BasicMessageFilter();
      const startsWithOperationPb = new pb.BasicMessageFilterOperationStartsWith();
      startsWithOperationPb.setValue(filter.value.value ?? '');
      startsWithOperationPb.setIsCaseSensitive(filter.value.isCaseSensitive ?? false);

      filter.value.target === 'key' && basicMessageFilterPb.setTarget(BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_KEY)
      filter.value.target === 'value' && basicMessageFilterPb.setTarget(BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_VALUE)
      filter.value.target === 'properties' && basicMessageFilterPb.setTarget(BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_PROPERTIES)
      filter.value.target === 'accum' && basicMessageFilterPb.setTarget(BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_ACCUM)

      basicMessageFilterPb.setStartsWith(startsWithOperationPb);

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
        value: {jsCode: filter.getJs()?.getJsCode() ?? ''},
        isEnabled: filter.getIsEnabled(),
        isNegated: filter.getIsNegated(),
      };
    case pb.MessageFilter.ValueCase.BASIC:
      const target =
        filter.getBasic()?.getTarget() === BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_KEY ? 'key' :
          filter.getBasic()?.getTarget() === BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_VALUE ? 'value' :
            filter.getBasic()?.getTarget() === BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_PROPERTIES ? 'properties' :
              filter.getBasic()?.getTarget() === BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_UNSPECIFIED ? 'value' :
                filter.getBasic()?.getTarget() === BasicMessageFilterTarget.BASIC_MESSAGE_FILTER_TARGET_ACCUM ? 'accum' :
                filter.getBasic() === undefined ? 'value' : 'value';

      switch (filter.getBasic()?.getOperationCase()) {
        case pb.BasicMessageFilter.OperationCase.CONTAINS:
          return {
            type: 'basic-message-filter-contains',
            value: {
              target: target,
              value: filter.getBasic()?.getContains()?.getValue() ?? undefined,
              isCaseSensitive: filter.getBasic()?.getContains()?.getIsCaseSensitive() ?? undefined,
            },
            isEnabled: filter.getIsEnabled(),
            isNegated: filter.getIsNegated(),
          }
        case pb.BasicMessageFilter.OperationCase.ENDS_WITH:
          return {
            type: 'basic-message-filter-end-with',
            value: {
              target: target,
              value: filter.getBasic()?.getEndsWith()?.getValue() ?? undefined,
              isCaseSensitive: filter.getBasic()?.getEndsWith()?.getIsCaseSensitive() ?? undefined,
            },
            isEnabled: filter.getIsEnabled(),
            isNegated: filter.getIsNegated(),
          }
        case pb.BasicMessageFilter.OperationCase.EQUALS: {
          return {
            type: 'basic-message-filter-equals',
            value: {
              target: target,
              value: filter.getBasic()?.getEquals()?.getValue() ?? undefined,
              isCaseSensitive: filter.getBasic()?.getEquals()?.getIsCaseSensitive() ?? undefined,
            },
            isEnabled: filter.getIsEnabled(),
            isNegated: filter.getIsNegated(),
          }
        }
        case pb.BasicMessageFilter.OperationCase.GREATER_THAN: {
          return {
            type: 'basic-message-filter-greater-than',
            value: {
              target: target,
              value: filter.getBasic()?.getGreaterThan()?.getValue() ?? undefined,
            },
            isEnabled: filter.getIsEnabled(),
            isNegated: filter.getIsNegated(),
          }
        }
        case pb.BasicMessageFilter.OperationCase.GREATER_THAN_OR_EQUALS: {
          return {
            type: 'basic-message-filter-greater-than-or-equals',
            value: {
              target: target,
              value: filter.getBasic()?.getGreaterThanOrEquals()?.getValue() ?? undefined,
            },
            isEnabled: filter.getIsEnabled(),
            isNegated: filter.getIsNegated(),
          }
        }
        case pb.BasicMessageFilter.OperationCase.IS_NULL: {
          return {
            type: 'basic-message-filter-is-null',
            value: {
              target: target,
            },
            isEnabled: filter.getIsEnabled(),
            isNegated: filter.getIsNegated(),
          }
        }
        case pb.BasicMessageFilter.OperationCase.IS_TRUTHY: {
          return {
            type: 'basic-message-filter-is-truthy',
            value: {
              target: target,
            },
            isEnabled: filter.getIsEnabled(),
            isNegated: filter.getIsNegated(),
          }
        }
        case pb.BasicMessageFilter.OperationCase.LESS_THAN: {
          return {
            type: 'basic-message-filter-less-than',
            value: {
              target: target,
              value: filter.getBasic()?.getLessThan()?.getValue() ?? undefined,
            },
            isEnabled: filter.getIsEnabled(),
            isNegated: filter.getIsNegated(),
          }
        }
        case pb.BasicMessageFilter.OperationCase.LESS_THAN_OR_EQUALS: {
          return {
            type: 'basic-message-filter-less-than-or-equals',
            value: {
              target: target,
              value: filter.getBasic()?.getLessThanOrEquals()?.getValue() ?? undefined,
            },
            isEnabled: filter.getIsEnabled(),
            isNegated: filter.getIsNegated(),
          }
        }
        case pb.BasicMessageFilter.OperationCase.REGEX: {
          return {
            type: 'basic-message-filter-regex',
            value: {
              target: target,
              value: filter.getBasic()?.getRegex()?.getValue() ?? undefined,
            },
            isEnabled: filter.getIsEnabled(),
            isNegated: filter.getIsNegated(),
          }
        }
        case pb.BasicMessageFilter.OperationCase.STARTS_WITH: {
          return {
            type: 'basic-message-filter-starts-with',
            value: {
              target: target,
              value: filter.getBasic()?.getStartsWith()?.getValue() ?? undefined,
              isCaseSensitive: filter.getBasic()?.getStartsWith()?.getIsCaseSensitive() ?? undefined,
            },
            isEnabled: filter.getIsEnabled(),
            isNegated: filter.getIsNegated(),
          }
        }
        default:
          //throw new Error(`Unknown BasicMessageFilter operation case. ${filter.getBasic()?.getOperationCase()}`);
          return {
            type: 'basic-message-filter-contains',
            value: {
              target: target,
              value: filter.getBasic()?.getContains()?.getValue() ?? undefined,
              isCaseSensitive: filter.getBasic()?.getContains()?.getIsCaseSensitive() ?? undefined,
            },
            isEnabled: filter.getIsEnabled(),
            isNegated: filter.getIsNegated(),
          }
      }
    default:
      //throw new Error(`Unknown MessageFilter value case. ${filter.getValueCase()}`);
      return {
        type: 'js-message-filter',
        value: {jsCode: filter.getJs()?.getJsCode() ?? ''},
        isEnabled: filter.getIsEnabled(),
        isNegated: filter.getIsNegated(),
      };
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
