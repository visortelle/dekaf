import { Message } from "../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb";
import { MessageDescriptor } from "./types";

export function messageDescriptorFromPb(message: Message): MessageDescriptor {
  const propertiesMap = Object.fromEntries(
    message.getPropertiesMap().toArray()
  );

  return {
    messageId: message.getMessageId_asU8(),
    value: message.getValue_asU8(),
    jsonValue: message.getJsonValue(),
    brokerPublishTime: message.getBrokerPublishTime()?.toDate(),
    eventTime: message.getEventTime()?.toDate(),
    isReplicated: message.getIsReplicated(),
    key: message.getKey(),
    orderingKey: message.getOrderingKey_asU8(),
    producerName: message.getProducerName(),
    propertiesMap,
    propertiesValue: JSON.stringify(propertiesMap),
    publishTime: message.getPublishTime()?.toDate(),
    redeliveryCount: message.getRedeliveryCount(),
    replicatedFrom: message.getReplicatedFrom(),
    schemaVersion: message.getSchemaVersion(),
    sequenceId: message.getSequenceId(),
    size: message.getSize(),
    topic: message.getTopic(),
    jsonAggregate: message.getJsonAggregate(),
  };
}
