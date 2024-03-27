import * as pb from '../../../../../grpc-web/tools/teal/pulsar/ui/producer/v1/producer_pb';
import { Int64Generator, int64GeneratorFromPb, int64GeneratorToPb } from '../data-generators/int64/int64-generator';

export type SequenceIdGenerator = {
  type: 'sequence-id-generator',
  generator: Int64Generator
};

export function sequenceIdGeneratorFromPb(v: pb.SequenceIdGenerator): SequenceIdGenerator {
  return {
    type: 'sequence-id-generator',
    generator: int64GeneratorFromPb(v.getGenerator()!)
  };
}

export function sequenceIdGeneratorToPb(v: SequenceIdGenerator): pb.SequenceIdGenerator {
  const generatorPb = new pb.SequenceIdGenerator();
  generatorPb.setGenerator(int64GeneratorToPb(v.generator));

  return generatorPb;
}
