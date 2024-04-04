import * as pb from '../../../../../../grpc-web/tools/teal/pulsar/ui/producer/v1/producer_pb';
import { BytesGenerator, bytesGeneratorFromPb, bytesGeneratorToPb } from '../data-generators/bytes/bytes-generator';
import { JsonGenerator, jsonGeneratorFromPb, jsonGeneratorToPb } from '../data-generators/json-generator/json-generator';
import { ValueFromTopicSchemaGenerator, valueFromTopicSchemaGeneratorFromPb, valueFromTopicSchemaGeneratorToPb } from './value-from-topic-schema-generator';

export type ValueGenerator = {
  type: 'value-generator',
  generator: {
    type: "from-bytes",
    generator: BytesGenerator
  } | {
    type: "from-json",
    generator: JsonGenerator
  } | {
    type: "value-from-topic-schema",
    generator: ValueFromTopicSchemaGenerator
  }
};

export function valueGeneratorFromPb(v: pb.ValueGenerator): ValueGenerator {
  let generator: ValueGenerator['generator'];
  switch (v.getGeneratorCase()) {
    case pb.ValueGenerator.GeneratorCase.GENERATOR_FROM_BYTES:
      generator = {
        type: "from-bytes",
        generator: bytesGeneratorFromPb(v.getGeneratorFromBytes()!)
      };
      break;
    case pb.ValueGenerator.GeneratorCase.GENERATOR_FROM_JSON:
      generator = {
        type: "from-json",
        generator: jsonGeneratorFromPb(v.getGeneratorFromJson()!)
      };
      break;
    case pb.ValueGenerator.GeneratorCase.GENERATOR_VALUE_FROM_TOPIC_SCHEMA:
      generator = {
        type: "value-from-topic-schema",
        generator: valueFromTopicSchemaGeneratorFromPb(v.getGeneratorValueFromTopicSchema()!)
      };
      break;
    default:
      throw new Error(`Unknown value generator: ${v.getGeneratorCase()}`);
  }

  return { type: 'value-generator', generator };
}

export function valueGeneratorToPb(v: ValueGenerator): pb.ValueGenerator {
  const message = new pb.ValueGenerator();

  switch (v.generator.type) {
    case 'from-bytes': {
      message.setGeneratorFromBytes(bytesGeneratorToPb(v.generator.generator));
      break;
    }
    case 'from-json': {
      message.setGeneratorFromJson(jsonGeneratorToPb(v.generator.generator));
      break;
    }
    case 'value-from-topic-schema': {
      message.setGeneratorValueFromTopicSchema(valueFromTopicSchemaGeneratorToPb(v.generator.generator));
      break;
    }
  }

  return message;
}
