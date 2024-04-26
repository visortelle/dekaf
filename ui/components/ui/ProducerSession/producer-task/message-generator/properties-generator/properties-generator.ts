import * as pb from '../../../../../../grpc-web/tools/teal/pulsar/ui/producer/v1/producer_pb';
import { JsonGenerator, jsonGeneratorFromPb, jsonGeneratorToPb } from '../data-generators/json-generator/json-generator';

export type PropertiesGenerator = {
  type: 'properties-generator',
  generator: JsonGenerator
};

export function propertiesGeneratorFromPb(v: pb.PropertiesGenerator): PropertiesGenerator {
  let generator: PropertiesGenerator['generator'];
  switch (v.getGeneratorCase()) {
    case pb.PropertiesGenerator.GeneratorCase.GENERATOR_FROM_JSON_OBJECT:
      generator = jsonGeneratorFromPb(v.getGeneratorFromJsonObject()!);
      break;
    default:
      throw new Error(`Unknown properties generator: ${v.getGeneratorCase()}`);
  }

  return { type: 'properties-generator', generator };
};

export function propertiesGeneratorToPb(v: PropertiesGenerator): pb.PropertiesGenerator {
  const message = new pb.PropertiesGenerator();
  message.setGeneratorFromJsonObject(jsonGeneratorToPb(v.generator));

  return message;
}
