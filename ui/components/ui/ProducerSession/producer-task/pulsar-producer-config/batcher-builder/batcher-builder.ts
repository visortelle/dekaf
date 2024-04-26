import * as pb from '../../../../../../grpc-web/tools/teal/pulsar/ui/producer/v1/producer_pb';

import { DefaultBatcherBuilder, defaultBatcherBuilderFromPb, defaultBatcherBuilderToPb } from "./default-batcher-builder";
import { KeyBasedBatcherBuilder, keyBasedBatcherBuilderFromPb, keyBasedBatcherBuilderToPb } from "./key-based-batcher-builder";

export type BatcherBuilder = {
  type: 'batcher-builder';
  builder: DefaultBatcherBuilder | KeyBasedBatcherBuilder;
}

export function batcherBuilderFromPb(v: pb.BatcherBuilder): BatcherBuilder {
  let builder: BatcherBuilder['builder'];
  switch (v.getBuilderCase()) {
    case pb.BatcherBuilder.BuilderCase.BUILDER_DEFAULT:
      builder = defaultBatcherBuilderFromPb(v.getBuilderDefault()!);
      break;
    case pb.BatcherBuilder.BuilderCase.BUILDER_KEY_BASED:
      builder = keyBasedBatcherBuilderFromPb(v.getBuilderKeyBased()!);
      break;
    default:
      throw new Error(`Unknown BatcherBuilder builder case: ${v.getBuilderCase()}`);
  }

  return {
    type: 'batcher-builder',
    builder
  }
}

export function batcherBuilderToPb(v: BatcherBuilder): pb.BatcherBuilder {
  const pbBuilder = new pb.BatcherBuilder();
  switch (v.builder.type) {
    case 'default-batcher-builder':
      pbBuilder.setBuilderDefault(defaultBatcherBuilderToPb(v.builder));
      break;
    case 'key-based-batcher-builder':
      pbBuilder.setBuilderKeyBased(keyBasedBatcherBuilderToPb(v.builder));
      break;
    default:
      throw new Error(`Unknown BatcherBuilder builder type: ${v.builder}`);
  }

  return pbBuilder;
}
