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
  StartFrom,
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


export function startFromFromPb(startFrom: pb.StartFrom): StartFrom {
  switch (startFrom.getValueCase()) {
    case pb.StartFrom.ValueCase.EARLIEST_MESSAGE:
      return { type: 'earliestMessage' };

    case pb.StartFrom.ValueCase.LATEST_MESSAGE:
      return { type: 'latestMessage' };

    case pb.StartFrom.ValueCase.MESSAGE_ID: {
      const byteArray = startFrom.getMessageId()?.getMessageId_asU8();
      if (byteArray === undefined) {
        throw new Error('Message Id should be defined.');
      }

      return { type: 'messageId', hexString: hexStringFromByteArray(byteArray) };
    }

    case pb.StartFrom.ValueCase.DATE_TIME: {
      const dateTimePb = startFrom.getDateTime()?.getDateTime();
      if (dateTimePb === undefined) {
        throw new Error('DateTime should be defined.');
      }
      return { type: 'dateTime', dateTime: new Date((dateTimePb.getSeconds() || 0) * 1000) };

    }

    case pb.StartFrom.ValueCase.RELATIVE_DATE_TIME: {
      const relativeDateTimePb = startFrom.getRelativeDateTime();
      if (relativeDateTimePb === undefined) {
        throw new Error('Relative date-time should be defined.');
      }

      return {
        type: 'relativeDateTime',
        value: {
          unit: dateTimeUnitFromPb(relativeDateTimePb.getUnit()),
          value: relativeDateTimePb.getValue(),
          isRoundToUnitStart: relativeDateTimePb.getIsRoundToUnitStart(),
        }
      };
    }

    default:
      throw new Error(`Unknown StartFrom value case. ${startFrom.getValueCase()}`);
  }
}

function startFromToPb(startFrom: StartFrom): pb.StartFrom {
  const startFromPb = new pb.StartFrom();

  switch (startFrom.type) {
    case 'earliestMessage':
      startFromPb.setEarliestMessage(new pb.StartFromEarliestMessage());
      break;
    case 'latestMessage':
      startFromPb.setLatestMessage(new pb.StartFromLatestMessage());
      break;
    case 'messageId':
      startFromPb.setMessageId(new pb.StartFromMessageId().setMessageId(hexStringToByteArray(startFrom.hexString)));
      break;
    case 'dateTime':
      const epochSeconds = Math.floor(startFrom.dateTime.getTime() / 1000);
      const timestampPb = new Timestamp();
      timestampPb.setSeconds(epochSeconds);
      startFromPb.setDateTime(new pb.StartFromDateTime().setDateTime(timestampPb));
      break;
    case 'relativeDateTime':
      const relativeDateTimePb = new pb.StartFromRelativeDateTime();
      relativeDateTimePb.setUnit(dateTimeUnitToPb(startFrom.value.unit))
      relativeDateTimePb.setValue(startFrom.value.value)
      relativeDateTimePb.setIsRoundToUnitStart(startFrom.value.isRoundToUnitStart)

      startFromPb.setRelativeDateTime(relativeDateTimePb);
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
    case "js-message-filter":
      return new pb.MessageFilter().setJs(new pb.JsMessageFilter().setJsCode(filter.value.jsCode));
    case "basic-message-filter":
      return new pb.MessageFilter().setBasic(new pb.BasicMessageFilter());
  }
}

export function messageFilterChainToPb(chain: MessageFilterChain): pb.MessageFilterChain {
  const chainPb = new pb.MessageFilterChain();
  chainPb.setMode(chain.mode === 'all' ? pb.MessageFilterChainMode.MESSAGE_FILTER_CHAIN_MODE_ALL : pb.MessageFilterChainMode.MESSAGE_FILTER_CHAIN_MODE_ANY);

  Object.entries(chain.filters)
    .filter(([filterId]) => !chain.disabledFilters.includes(filterId))
    .forEach(([filterId, filter]) => {
      const filterPb = messageFilterToPb(filter);
      chainPb.getFiltersMap().set(filterId, filterPb);
    });

  return chainPb;
}
