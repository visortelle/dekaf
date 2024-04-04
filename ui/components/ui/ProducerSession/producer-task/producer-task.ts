import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/producer/v1/producer_pb';
import { Int64Value } from 'google-protobuf/google/protobuf/wrappers_pb';
import { MessageGenerator, messageGeneratorFromPb, messageGeneratorToPb } from './message-generator/message-generator';
import { PulsarProducerConfig, pulsarProducerConfigFromPb, pulsarProducerConfigToPb } from './pulsar-producer-config/pulsar-producer-config';
import { TopicSelector } from '../../ConsumerSession/topic-selector/topic-selector';
import { topicSelectorFromPb, topicSelectorToPb } from '../../ConsumerSession/conversions/conversions';

export type ProducerTask = {
  type: 'producer-task',
  topicSelector: TopicSelector,
  messageGenerator: MessageGenerator,
  producerConfig: PulsarProducerConfig | undefined,
  numMessages: number | undefined,
  limitDurationNanos: number | undefined,
  intervalNanos: number | undefined,
};

export function producerTaskFromPb(v: pb.ProducerTask): ProducerTask {
  return {
    type: 'producer-task',
    topicSelector: topicSelectorFromPb(v.getTopicSelector()!),
    messageGenerator: messageGeneratorFromPb(v.getMessageGenerator()!),
    producerConfig: pulsarProducerConfigFromPb(v.getProducerConfig()!),
    numMessages: v.getNumMessages()?.getValue(),
    limitDurationNanos: v.getLimitDurationNanos()?.getValue(),
    intervalNanos: v.getIntervalNanos()?.getValue(),
  };
}

export function producerTaskToPb(v: ProducerTask): pb.ProducerTask {
  const producerTaskPb = new pb.ProducerTask();
  producerTaskPb.setTopicSelector(topicSelectorToPb(v.topicSelector));
  producerTaskPb.setMessageGenerator(messageGeneratorToPb(v.messageGenerator));

  if (v.producerConfig !== undefined) {
    producerTaskPb.setProducerConfig(pulsarProducerConfigToPb(v.producerConfig));
  }

  if (v.numMessages !== undefined) {
    producerTaskPb.setNumMessages(new Int64Value().setValue(v.numMessages));
  }
  if (v.limitDurationNanos !== undefined) {
    producerTaskPb.setLimitDurationNanos(new Int64Value().setValue(v.limitDurationNanos));
  }
  if (v.intervalNanos !== undefined) {
    producerTaskPb.setIntervalNanos(new Int64Value().setValue(v.intervalNanos));
  }

  return producerTaskPb;
}
