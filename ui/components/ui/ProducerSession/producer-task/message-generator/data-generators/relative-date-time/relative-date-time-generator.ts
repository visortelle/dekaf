import * as pb from '../../../../../../../grpc-web/tools/teal/pulsar/ui/producer/v1/producer_pb';
import { JsonGenerator, jsonGeneratorFromPb, jsonGeneratorToPb } from '../json-generator/json-generator';
import { FixedRelativeDateTimeGenerator, fixedRelativeDateTimeGeneratorFromPb, fixedRelativeDateTimeGeneratorToPb } from './fixed-relative-date-time-generator';

export type RelativeDateTimeGenerator = {
  type: 'relative-date-time-generator',
  generator: FixedRelativeDateTimeGenerator | { type: 'relative-date-time-generator-from-json-number-millis', generator: JsonGenerator }
};

export function relativeDateTimeGeneratorFromPb(v: pb.RelativeDateTimeGenerator): RelativeDateTimeGenerator {
  switch (v.getGeneratorCase()) {
    case pb.RelativeDateTimeGenerator.GeneratorCase.GENERATOR_FIXED_RELATIVE_DATE_TIME:
      return {
        type: 'relative-date-time-generator',
        generator: fixedRelativeDateTimeGeneratorFromPb(v.getGeneratorFixedRelativeDateTime()!)
      };
    case pb.RelativeDateTimeGenerator.GeneratorCase.GENERATOR_FROM_JSON_NUMBER_MILLIS:
      return {
        type: 'relative-date-time-generator',
        generator: {
          type: 'relative-date-time-generator-from-json-number-millis',
          generator: jsonGeneratorFromPb(v.getGeneratorFromJsonNumberMillis()!)
        }
      };
    default:
      throw new Error(`Unknown generator case: ${v.getGeneratorCase()}`);
  }
}

export function relativeDateTimeGeneratorToPb(v: RelativeDateTimeGenerator): pb.RelativeDateTimeGenerator {
  const generatorPb = new pb.RelativeDateTimeGenerator();

  switch(v.generator.type) {
    case 'fixed-relative-date-time-generator': {
      generatorPb.setGeneratorFixedRelativeDateTime(fixedRelativeDateTimeGeneratorToPb(v.generator));
      break;
    }
    case 'relative-date-time-generator-from-json-number-millis': {
      generatorPb.setGeneratorFromJsonNumberMillis(jsonGeneratorToPb(v.generator.generator));
      break;
    }
  }

  return generatorPb;
}
