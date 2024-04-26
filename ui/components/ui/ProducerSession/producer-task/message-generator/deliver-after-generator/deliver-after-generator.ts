import * as pb from '../../../../../../grpc-web/tools/teal/pulsar/ui/producer/v1/producer_pb';
import { RelativeDateTimeGenerator, relativeDateTimeGeneratorFromPb, relativeDateTimeGeneratorToPb } from '../data-generators/relative-date-time/relative-date-time-generator';

export type DeliverAfterGenerator = {
  type: 'deliver-after-generator',
  generator: RelativeDateTimeGenerator
};

export function deliverAfterGeneratorFromPb(v: pb.DeliverAfterGenerator): DeliverAfterGenerator {
  return {
    type: 'deliver-after-generator',
    generator: relativeDateTimeGeneratorFromPb(v.getGenerator()!)
  };
}

export function deliverAfterGeneratorToPb(v: DeliverAfterGenerator): pb.DeliverAfterGenerator {
  const generatorPb = new pb.DeliverAfterGenerator();
  generatorPb.setGenerator(relativeDateTimeGeneratorToPb(v.generator));

  return generatorPb;
}
