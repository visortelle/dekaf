import * as pb from '../../../../../../grpc-web/tools/teal/pulsar/ui/producer/v1/producer_pb';
import { FixedJsonGenerator, fixedJsonGeneratorFromPb, fixedJsonGeneratorToPb } from './fixed-json-generator';
import { JsJsonGenerator, jsJsonGeneratorFromPb, jsJsonGeneratorToPb } from './js-json-generator';

export type JsonGenerator = {
  generator: FixedJsonGenerator | JsJsonGenerator
}

export function jsonGeneratorFromPb(v: pb.JsonGenerator): JsonGenerator {
  let generator: JsonGenerator['generator'];
  switch (v.getGeneratorCase()) {
    case pb.JsonGenerator.GeneratorCase.GENERATOR_FIXED:
      generator = fixedJsonGeneratorFromPb(v.getGeneratorFixed()!);
      break;
    case pb.JsonGenerator.GeneratorCase.GENERATOR_JS:
      generator = jsJsonGeneratorFromPb(v.getGeneratorJs()!);
      break;
    default:
      throw new Error(`Unknown json generator: ${v.getGeneratorCase()}`);
  }

  return { generator };
}

export function jsonGeneratorToPb(v: JsonGenerator): pb.JsonGenerator {
  const message = new pb.JsonGenerator();
  if ('json' in v.generator) {
    message.setGeneratorFixed(fixedJsonGeneratorToPb(v.generator));
  } else {
    message.setGeneratorJs(jsJsonGeneratorToPb(v.generator));
  }

  return message;
}
