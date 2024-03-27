import * as pb from '../../../../../grpc-web/tools/teal/pulsar/ui/producer/v1/producer_pb';

export type KeyBasedBatcherBuilder = {
  type: 'key-based-batcher-builder'
};

export function keyBasedBatcherBuilderFromPb(v: pb.KeyBasedBatcherBuilder): KeyBasedBatcherBuilder {
  return { type: 'key-based-batcher-builder' };
}

export function keyBasedBatcherBuilderToPb(v: KeyBasedBatcherBuilder): pb.KeyBasedBatcherBuilder {
  return new pb.KeyBasedBatcherBuilder();
}
