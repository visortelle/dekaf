import * as pb from '../../../../../../grpc-web/tools/teal/pulsar/ui/producer/v1/producer_pb';
import { StringGenerator, stringGeneratorFromPb, stringGeneratorToPb } from '../string-generator/string-generator';

export type BytesFromHexGenerator = {
  type: 'bytes-from-hex-generator',
  generator: StringGenerator
};

export function bytesFromHexGeneratorFromPb(v: pb.BytesFromHexGenerator): BytesFromHexGenerator {
  return {
    type: 'bytes-from-hex-generator',
    generator: stringGeneratorFromPb(v.getGenerator()!)
  };
}

export function bytesFromHexGeneratorToPb(v: BytesFromHexGenerator): pb.BytesFromHexGenerator {
  const message = new pb.BytesFromHexGenerator();
  message.setGenerator(stringGeneratorToPb(v.generator));

  return message;
}
