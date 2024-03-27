import * as pb from '../../../../../../grpc-web/tools/teal/pulsar/ui/producer/v1/producer_pb';
import { BytesFromBase64Generator, bytesFromBase64GeneratorFromPb } from './bytes-from-base64-generator';
import { BytesFromHexGenerator, bytesFromHexGeneratorFromPb } from './bytes-from-hex-generator';
import { RandomBytesGenerator, randomBytesGeneratorFromPb } from './random-bytes-generator';

export type BytesGenerator = {
  type: 'bytes-generator',
  generator: RandomBytesGenerator | BytesFromBase64Generator | BytesFromHexGenerator
};

export function bytesGeneratorFromPb(v: pb.BytesGenerator): BytesGenerator {
  switch (v.getGeneratorCase()) {
    case pb.BytesGenerator.GeneratorCase.GENERATOR_RANDOM_BYTES:
      return {
        type: 'bytes-generator',
        generator: randomBytesGeneratorFromPb(v.getGeneratorRandomBytes()!)
      };
    case pb.BytesGenerator.GeneratorCase.GENERATOR_FROM_BASE64:
      return {
        type: 'bytes-generator',
        generator: bytesFromBase64GeneratorFromPb(v.getGeneratorFromBase64()!)
      };
    case pb.BytesGenerator.GeneratorCase.GENERATOR_FROM_HEX:
      return {
        type: 'bytes-generator',
        generator: bytesFromHexGeneratorFromPb(v.getGeneratorFromHex()!)
      };
    default:
      throw new Error('Unknown bytes generator case');
  }
}
