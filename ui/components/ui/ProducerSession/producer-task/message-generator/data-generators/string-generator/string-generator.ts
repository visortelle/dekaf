import * as pb from '../../../../../../../grpc-web/tools/teal/pulsar/ui/producer/v1/producer_pb';
import { JsonGenerator, jsonGeneratorFromPb, jsonGeneratorToPb } from '../json-generator/json-generator';
import { FixedStringGenerator, fixedStringGeneratorFromPb, fixedStringGeneratorToPb } from './fixed-string-generator';

export type StringGenerator = {
  type: 'string-generator',
  generator: FixedStringGenerator | JsonGenerator
};

export function stringGeneratorFromPb(v: pb.StringGenerator): StringGenerator {
  let generator: StringGenerator['generator'];
  switch (v.getGeneratorCase()) {
    case pb.StringGenerator.GeneratorCase.GENERATOR_FIXED_STRING:
      generator = fixedStringGeneratorFromPb(v.getGeneratorFixedString()!);
      break;
    case pb.StringGenerator.GeneratorCase.GENERATOR_FROM_JSON_STRING:
      generator = jsonGeneratorFromPb(v.getGeneratorFromJsonString()!);
      break;
    default:
      throw new Error(`Unknown string generator: ${v.getGeneratorCase()}`);
  }

  return { type: 'string-generator', generator };
}

export function stringGeneratorToPb(v: StringGenerator): pb.StringGenerator {
  const message = new pb.StringGenerator();
  if ('string' in v.generator) {
    message.setGeneratorFixedString(fixedStringGeneratorToPb(v.generator));
  } else {
    message.setGeneratorFromJsonString(jsonGeneratorToPb(v.generator));
  }

  return message;
}
