import * as pb from '../../../../../grpc-web/tools/teal/pulsar/ui/producer/v1/producer_pb';
import { DateTimeGenerator, dateTimeGeneratorFromPb, dateTimeGeneratorToPb } from '../data-generators/date-time/date-time-generator';

export type DeliverAtGenerator = {
  type: 'deliver-at-generator',
  generator: DateTimeGenerator
};

export function deliverAtGeneratorFromPb(v: pb.DeliverAtGenerator): DeliverAtGenerator {
  return {
    type: 'deliver-at-generator',
    generator: dateTimeGeneratorFromPb(v.getGenerator()!)
  };
}

export function deliverAtGeneratorToPb(v: DeliverAtGenerator): pb.DeliverAtGenerator {
  const generatorPb = new pb.DeliverAtGenerator();
  generatorPb.setGenerator(dateTimeGeneratorToPb(v.generator));

  return generatorPb;
}
