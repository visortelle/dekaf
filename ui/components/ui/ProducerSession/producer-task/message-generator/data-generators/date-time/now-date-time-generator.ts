import * as pb from '../../../../../../../grpc-web/tools/teal/pulsar/ui/producer/v1/producer_pb';

export type NowDateTimeGenerator = {
  type: 'now-date-time-generator'
};

export function nowDateTimeGeneratorFromPb(v: pb.NowDateTimeGenerator): NowDateTimeGenerator {
  return {
    type: 'now-date-time-generator'
  };
}

export function nowDateTimeGeneratorToPb(v: NowDateTimeGenerator): pb.NowDateTimeGenerator {
  const message = new pb.NowDateTimeGenerator();

  return message;
}
