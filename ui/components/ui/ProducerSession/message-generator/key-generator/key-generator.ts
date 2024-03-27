import * as pb from '../../../../../grpc-web/tools/teal/pulsar/ui/producer/v1/producer_pb';
import { JsonGenerator, jsonGeneratorFromPb, jsonGeneratorToPb } from '../data-generators/json-generator/json-generator';
import { RandomUuidV4Generator, randomUuidV4GeneratorFromPb, randomUuidV4GeneratorToPb } from '../data-generators/random-uuid-v4-generator';
import { StringGenerator, stringGeneratorFromPb, stringGeneratorToPb } from '../data-generators/string-generator/string-generator';

export type KeyGenerator = {
  type: 'key-generator',
  generator: {
    type: 'from-random-uuid-v-4',
    generator: RandomUuidV4Generator
  } | {
    type: 'from-string',
    generator: StringGenerator
  } | {
    type: 'from-json',
    generator: JsonGenerator
  }
};


export function keyGeneratorFromPb(v: pb.KeyGenerator): KeyGenerator {
  let generator: KeyGenerator['generator'];

  switch (v.getGeneratorCase()) {
    case pb.KeyGenerator.GeneratorCase.GENERATOR_RANDOM_UUID_V4: {
      generator = { type: 'from-random-uuid-v-4', generator: randomUuidV4GeneratorFromPb(v.getGeneratorRandomUuidV4()!) };
      break;
    }
    case pb.KeyGenerator.GeneratorCase.GENERATOR_STRING: {
      generator = { type: 'from-string', generator: stringGeneratorFromPb(v.getGeneratorString()!) };
      break;
    }
    case pb.KeyGenerator.GeneratorCase.GENERATOR_FROM_JSON: {
      generator = { type: 'from-json', generator: jsonGeneratorFromPb(v.getGeneratorFromJson()!) };
      break;
    }
    default:
      throw new Error(`Unknown key generator: ${v.getGeneratorCase()}`);
  }

  return { type: 'key-generator', generator };
}

export function keyGeneratorToPb(v: KeyGenerator): pb.KeyGenerator {
  const message = new pb.KeyGenerator();

  switch (v.generator.type) {
    case 'from-random-uuid-v-4': {
      message.setGeneratorRandomUuidV4(randomUuidV4GeneratorToPb(v.generator.generator));
      break;
    }
    case 'from-string': {
      message.setGeneratorString(stringGeneratorToPb(v.generator.generator));
      break;
    }
    case 'from-json': {
      message.setGeneratorFromJson(jsonGeneratorToPb(v.generator.generator));
      break;
    }
  }

  return message;
}
