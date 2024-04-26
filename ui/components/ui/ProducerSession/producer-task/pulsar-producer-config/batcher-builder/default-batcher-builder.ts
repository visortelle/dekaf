import * as pb from '../../../../../../grpc-web/tools/teal/pulsar/ui/producer/v1/producer_pb';

export type DefaultBatcherBuilder = {
  type: 'default-batcher-builder'
};

export function defaultBatcherBuilderFromPb(v: pb.DefaultBatcherBuilder): DefaultBatcherBuilder {
  return { type: 'default-batcher-builder' };
}

export function defaultBatcherBuilderToPb(v: DefaultBatcherBuilder): pb.DefaultBatcherBuilder {
  return new pb.DefaultBatcherBuilder();
}
