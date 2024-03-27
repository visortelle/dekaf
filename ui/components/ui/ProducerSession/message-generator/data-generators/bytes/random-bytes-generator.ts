import * as pb from '../../../../../../grpc-web/tools/teal/pulsar/ui/producer/v1/producer_pb';

export type RandomBytesGenerator = {
  type: 'random-bytes-generator',
  minBytes: number,
  maxBytes: number
};

export function randomBytesGeneratorFromPb(v: pb.RandomBytesGenerator): RandomBytesGenerator {
  return {
    type: 'random-bytes-generator',
    minBytes: v.getMinBytes(),
    maxBytes: v.getMaxBytes()
  };
}

export function randomBytesGeneratorToPb(v: RandomBytesGenerator): pb.RandomBytesGenerator {
  const message = new pb.RandomBytesGenerator();
  message.setMinBytes(v.minBytes);
  message.setMaxBytes(v.maxBytes);

  return message;
}
