import { Message } from "../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb";
import { MessageDescriptor, PartialMessageDescriptor } from "./types";

export function messageDescriptorFromPb(message: Message): MessageDescriptor {
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
