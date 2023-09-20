import * as pb from "../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb";
import {
  MessageDescriptor,
  PartialMessageDescriptor,
  ConsumerSessionConfig,
  BasicMessageFilter,
  JsMessageFilter,
  MessageFilter,
  MessageFilterChain,
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

export function subscriptionInitialPositionToPb(position: "earliest" | "latest"): pb.SubscriptionInitialPosition {

}


export function consumerSessionConfigToPb(config: ConsumerSessionConfig): pb.ConsumerSessionConfig {
  // req.setSubscriptionInitialPosition(startFrom.type === 'earliest' ? SubscriptionInitialPosition.SUBSCRIPTION_INITIAL_POSITION_EARLIEST : SubscriptionInitialPosition.SUBSCRIPTION_INITIAL_POSITION_LATEST);
  const configPb = new pb.ConsumerSessionConfig();
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
