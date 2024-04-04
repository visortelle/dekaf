import * as pb from '../../../../../../../grpc-web/tools/teal/pulsar/ui/producer/v1/producer_pb';
import { JsonGenerator, jsonGeneratorFromPb, jsonGeneratorToPb } from '../json-generator/json-generator';
import { FixedDateTimeGenerator, fixedDateTimeGeneratorFromPb, fixedDateTimeGeneratorToPb } from './fixed-date-time-generator';
import { NowDateTimeGenerator, nowDateTimeGeneratorFromPb, nowDateTimeGeneratorToPb } from './now-date-time-generator';

export type DateTimeGenerator = {
  type: 'date-time-generator',
  generator: NowDateTimeGenerator | FixedDateTimeGenerator | { type: 'from-json-millis-or-iso', generator: JsonGenerator };
};

export function dateTimeGeneratorFromPb(v: pb.DateTimeGenerator): DateTimeGenerator {
  let generator: DateTimeGenerator['generator'];
  switch (v.getGeneratorCase()) {
    case pb.DateTimeGenerator.GeneratorCase.GENERATOR_FIXED_DATE_TIME:
      generator = fixedDateTimeGeneratorFromPb(v.getGeneratorFixedDateTime()!);
      break;
    case pb.DateTimeGenerator.GeneratorCase.GENERATOR_NOW:
      generator = nowDateTimeGeneratorFromPb(v.getGeneratorNow()!);
      break;
    case pb.DateTimeGenerator.GeneratorCase.GENERATOR_FROM_JSON_MILLIS_OR_ISO:
      generator = { type: 'from-json-millis-or-iso', generator: jsonGeneratorFromPb(v.getGeneratorFromJsonMillisOrIso()!) };
      break;
    default:
      throw new Error(`Unknown date-time generator: ${v.getGeneratorCase()}`);
  }

  return { type: 'date-time-generator', generator };

}

export function dateTimeGeneratorToPb(v: DateTimeGenerator): pb.DateTimeGenerator {
  const message = new pb.DateTimeGenerator();

  switch (v.generator.type) {
    case 'fixed-date-time-generator': {
      message.setGeneratorFixedDateTime(fixedDateTimeGeneratorToPb(v.generator));
      break;
    }
    case 'now-date-time-generator': {
      message.setGeneratorNow(nowDateTimeGeneratorToPb(v.generator));
      break;
    }
    case 'from-json-millis-or-iso': {
      message.setGeneratorFromJsonMillisOrIso(jsonGeneratorToPb(v.generator.generator));
      break;
    }
  }

  return message;
}
