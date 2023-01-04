import { Message } from "../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb";
import { MessageDescriptor } from "./types";

export function messageDescriptorFromPb(message: Message): MessageDescriptor {
  const propertiesMap = Object.fromEntries(
    message.getPropertiesMap().toArray()
  );

  return {
    messageId: message.getMessageId()?.getValue_asU8() ?? null,
    bytes: message.getBytes()?.getValue_asU8() ?? null,
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
    accumulator: message.getAccumulator()?.getValue() ?? null,
  };
}
