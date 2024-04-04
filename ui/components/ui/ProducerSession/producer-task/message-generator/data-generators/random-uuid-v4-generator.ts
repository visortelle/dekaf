import * as pb from '../../../../../../grpc-web/tools/teal/pulsar/ui/producer/v1/producer_pb';

export type RandomUuidV4Generator = {
  type: 'random-uuid-v4-generator'
};

export function randomUuidV4GeneratorFromPb(v: pb.RandomUuidV4Generator): RandomUuidV4Generator {
  return {
    type: 'random-uuid-v4-generator'
  };
}

export function randomUuidV4GeneratorToPb(v: RandomUuidV4Generator): pb.RandomUuidV4Generator {
  return new pb.RandomUuidV4Generator();
}
