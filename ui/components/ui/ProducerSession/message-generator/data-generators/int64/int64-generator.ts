import * as pb from '../../../../../../grpc-web/tools/teal/pulsar/ui/producer/v1/producer_pb';
import { JsonGenerator, jsonGeneratorFromPb } from '../json-generator/json-generator';

export type Int64Generator = {
  type: 'int64-generator',
  generator: { type: 'fixed-int64', n: number } | { type: 'from-json', jsonGenerator: JsonGenerator };
};

export function int64GeneratorFromPb(v: pb.Int64Generator): Int64Generator {
  let generator: Int64Generator['generator'];
  switch (v.getGeneratorCase()) {
    case pb.Int64Generator.GeneratorCase.GENERATOR_FIXED_INT64:
      generator = { type: 'fixed-int64', n: v.getGeneratorFixedInt64() };
      break;
    case pb.Int64Generator.GeneratorCase.GENERATOR_FROM_JSON:
      generator = { type: 'from-json', jsonGenerator: jsonGeneratorFromPb(v.getGeneratorFromJson()!) };
      break;
    default:
      throw new Error(`Unknown int64 generator case: ${v.getGeneratorCase()}`);
  }

  return { type: 'int64-generator', generator };
}
