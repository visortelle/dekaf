import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/producer/v1/producer_pb';
import { DeliverAfterGenerator, deliverAfterGeneratorFromPb, deliverAfterGeneratorToPb } from './deliver-after-generator/deliver-after-generator';
import { DeliverAtGenerator, deliverAtGeneratorFromPb, deliverAtGeneratorToPb } from './deliver-at-generator/deliver-at-generator';
import { EventTimeGenerator, eventTimeGeneratorFromPb, eventTimeGeneratorToPb } from './event-time-generator/event-time-generator';
import { KeyGenerator, keyGeneratorFromPb, keyGeneratorToPb } from './key-generator/key-generator';
import { OrderingKeyGenerator, orderingKeyGeneratorFromPb, orderingKeyGeneratorToPb } from './ordering-key-generator/ordering-key-generator';
import { PropertiesGenerator, propertiesGeneratorFromPb, propertiesGeneratorToPb } from './properties-generator/properties-generator';
import { SequenceIdGenerator, sequenceIdGeneratorFromPb, sequenceIdGeneratorToPb } from './sequence-id-generator/sequence-id-generator';
import { ValueGenerator, valueGeneratorFromPb, valueGeneratorToPb } from './value-generator/value-generator';

export type MessageGenerator = {
  type: 'message-generator',
  keyGenerator: KeyGenerator | undefined,
  valueGenerator: ValueGenerator | undefined,
  propertiesGenerator: PropertiesGenerator | undefined,
  eventTimeGenerator: EventTimeGenerator | undefined,
  deliverAtGenerator: DeliverAtGenerator | undefined,
  deliverAfterGenerator: DeliverAfterGenerator | undefined,
  orderingKeyGenerator: OrderingKeyGenerator | undefined,
  sequenceIdGenerator: SequenceIdGenerator | undefined
};

export function messageGeneratorFromPb(v: pb.MessageGenerator): MessageGenerator {
  return {
    type: 'message-generator',
    keyGenerator: v.hasKeyGenerator() ? keyGeneratorFromPb(v.getKeyGenerator()!) : undefined,
    valueGenerator: v.hasValueGenerator() ? valueGeneratorFromPb(v.getValueGenerator()!) : undefined,
    propertiesGenerator: v.hasPropertiesGenerator() ? propertiesGeneratorFromPb(v.getPropertiesGenerator()!) : undefined,
    eventTimeGenerator: v.hasEventTimeGenerator() ? eventTimeGeneratorFromPb(v.getEventTimeGenerator()!) : undefined,
    deliverAtGenerator: v.hasDeliverAtGenerator() ? deliverAtGeneratorFromPb(v.getDeliverAtGenerator()!) : undefined,
    deliverAfterGenerator: v.hasDeliverAfterGenerator() ? deliverAfterGeneratorFromPb(v.getDeliverAfterGenerator()!) : undefined,
    orderingKeyGenerator: v.hasOrderingKeyGenerator() ? orderingKeyGeneratorFromPb(v.getOrderingKeyGenerator()!) : undefined,
    sequenceIdGenerator: v.hasSequenceIdGenerator() ? sequenceIdGeneratorFromPb(v.getSequenceIdGenerator()!) : undefined
  };
}

export function messageGeneratorToPb(v: MessageGenerator): pb.MessageGenerator {
  const generatorPb = new pb.MessageGenerator();
  if (v.keyGenerator !== undefined) {
    generatorPb.setKeyGenerator(keyGeneratorToPb(v.keyGenerator));
  }
  if (v.valueGenerator !== undefined) {
    generatorPb.setValueGenerator(valueGeneratorToPb(v.valueGenerator));
  }
  if (v.propertiesGenerator !== undefined) {
    generatorPb.setPropertiesGenerator(propertiesGeneratorToPb(v.propertiesGenerator));
  }
  if (v.eventTimeGenerator !== undefined) {
    generatorPb.setEventTimeGenerator(eventTimeGeneratorToPb(v.eventTimeGenerator));
  }
  if (v.deliverAtGenerator !== undefined) {
    generatorPb.setDeliverAtGenerator(deliverAtGeneratorToPb(v.deliverAtGenerator));
  }
  if (v.deliverAfterGenerator !== undefined) {
    generatorPb.setDeliverAfterGenerator(deliverAfterGeneratorToPb(v.deliverAfterGenerator));
  }
  if (v.orderingKeyGenerator !== undefined) {
    generatorPb.setOrderingKeyGenerator(orderingKeyGeneratorToPb(v.orderingKeyGenerator));
  }
  if (v.sequenceIdGenerator !== undefined) {
    generatorPb.setSequenceIdGenerator(sequenceIdGeneratorToPb(v.sequenceIdGenerator));
  }

  return generatorPb;
}
