import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/producer/v1/producer_pb';
import { Int64Value } from 'google-protobuf/google/protobuf/wrappers_pb';
import { MessageGenerator, messageGeneratorFromPb, messageGeneratorToPb } from './message-generator/message-generator';
import { PulsarProducerConfig, pulsarProducerConfigFromPb, pulsarProducerConfigToPb } from './pulsar-producer-config/pulsar-producer-config';

export type ProducerTask = {
  type: 'producer-task',
  targetTopicFqn: string,
  messageGenerator: MessageGenerator,
  producerConfig: PulsarProducerConfig,
  numMessages: number | undefined,
  limitDurationNanos: number | undefined,
  intervalNanos: number | undefined,
};

export function producerTaskFromPb(v: pb.ProducerTask): ProducerTask {
  return {
    type: 'producer-task',
    targetTopicFqn: v.getTargetTopicFqn(),
    messageGenerator: messageGeneratorFromPb(v.getMessageGenerator()!),
    producerConfig: pulsarProducerConfigFromPb(v.getProducerConfig()!),
    numMessages: v.getNumMessages()?.getValue(),
    limitDurationNanos: v.getLimitDurationNanos()?.getValue(),
    intervalNanos: v.getIntervalNanos()?.getValue(),
  };
}

export function producerTaskToPb(v: ProducerTask): pb.ProducerTask {
  const producerTaskPb = new pb.ProducerTask();
  producerTaskPb.setTargetTopicFqn(v.targetTopicFqn);
  producerTaskPb.setMessageGenerator(messageGeneratorToPb(v.messageGenerator));
  producerTaskPb.setProducerConfig(pulsarProducerConfigToPb(v.producerConfig));
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
