import * as pb from '../../../../../../grpc-web/tools/teal/pulsar/ui/producer/v1/producer_pb';
import { DateTimeGenerator, dateTimeGeneratorFromPb, dateTimeGeneratorToPb } from '../data-generators/date-time/date-time-generator';

export type EventTimeGenerator = {
  type: 'event-time-generator',
  generator: DateTimeGenerator
};

export function eventTimeGeneratorFromPb(v: pb.EventTimeGenerator): EventTimeGenerator {
  return {
    type: 'event-time-generator',
    generator: dateTimeGeneratorFromPb(v.getGenerator()!)
  };
}

export function eventTimeGeneratorToPb(v: EventTimeGenerator): pb.EventTimeGenerator {
  const generatorPb = new pb.EventTimeGenerator();
  generatorPb.setGenerator(dateTimeGeneratorToPb(v.generator));

  return generatorPb;
}
