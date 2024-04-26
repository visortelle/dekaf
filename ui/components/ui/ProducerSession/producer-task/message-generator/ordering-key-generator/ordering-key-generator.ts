import * as pb from '../../../../../../grpc-web/tools/teal/pulsar/ui/producer/v1/producer_pb';
import { BytesGenerator, bytesGeneratorFromPb, bytesGeneratorToPb } from '../data-generators/bytes/bytes-generator';

export type OrderingKeyGenerator = {
  type: 'ordering-key-generator',
  fromBytes: BytesGenerator
};

export function orderingKeyGeneratorFromPb(v: pb.OrderingKeyGenerator): OrderingKeyGenerator {
  return {
    type: 'ordering-key-generator',
    fromBytes: bytesGeneratorFromPb(v.getFromBytes()!)
  };
}

export function orderingKeyGeneratorToPb(v: OrderingKeyGenerator): pb.OrderingKeyGenerator {
  const generatorPb = new pb.OrderingKeyGenerator();
  generatorPb.setFromBytes(bytesGeneratorToPb(v.fromBytes));

  return generatorPb;
}
