import * as pb from '../../../../../../../grpc-web/tools/teal/pulsar/ui/producer/v1/producer_pb';
import { DateTimeUnit, dateTimeUnitFromPb, dateTimeUnitToPb } from './date-time-unit';

export type FixedRelativeDateTimeGenerator = {
  type: 'fixed-relative-date-time-generator',
  value: number,
  unit: DateTimeUnit,
  isRoundedToUnitStart: boolean
};

export function fixedRelativeDateTimeGeneratorFromPb(v: pb.FixedRelativeDateTimeGenerator): FixedRelativeDateTimeGenerator {
  return {
    type: 'fixed-relative-date-time-generator',
    value: v.getValue(),
    unit: dateTimeUnitFromPb(v.getUnit()),
    isRoundedToUnitStart: v.getIsRoundedToUnitStart()
  };
}

export function fixedRelativeDateTimeGeneratorToPb(v: FixedRelativeDateTimeGenerator): pb.FixedRelativeDateTimeGenerator {
  const message = new pb.FixedRelativeDateTimeGenerator();
  message.setValue(v.value);
  message.setUnit(dateTimeUnitToPb(v.unit));
  message.setIsRoundedToUnitStart(v.isRoundedToUnitStart);

  return message;
}
