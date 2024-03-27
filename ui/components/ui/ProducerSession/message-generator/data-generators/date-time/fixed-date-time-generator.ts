import * as pb from '../../../../../../grpc-web/tools/teal/pulsar/ui/producer/v1/producer_pb';

export type FixedDateTimeGenerator = {
  type: 'fixed-date-time-generator',
  unixEpochMillis: number
};

export function fixedDateTimeGeneratorFromPb(v: pb.FixedDateTimeGenerator): FixedDateTimeGenerator {
  return {
    type: 'fixed-date-time-generator',
    unixEpochMillis: v.getUnixEpochMillis()
  };
}

export function fixedDateTimeGeneratorToPb(v: FixedDateTimeGenerator): pb.FixedDateTimeGenerator {
  const message = new pb.FixedDateTimeGenerator();
  message.setUnixEpochMillis(v.unixEpochMillis);

  return message;
}
