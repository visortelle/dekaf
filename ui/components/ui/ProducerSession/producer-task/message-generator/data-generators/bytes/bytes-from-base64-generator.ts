import * as pb from '../../../../../../../grpc-web/tools/teal/pulsar/ui/producer/v1/producer_pb';
import { StringGenerator, stringGeneratorFromPb, stringGeneratorToPb } from '../string-generator/string-generator';

export type BytesFromBase64Generator = {
  type: 'bytes-from-base64-generator',
  generator: StringGenerator
};

export function bytesFromBase64GeneratorFromPb(v: pb.BytesFromBase64Generator): BytesFromBase64Generator {
  return {
    type: 'bytes-from-base64-generator',
    generator: stringGeneratorFromPb(v.getGenerator()!)
  };
}

export function bytesFromBase64GeneratorToPb(v: BytesFromBase64Generator): pb.BytesFromBase64Generator {
  const message = new pb.BytesFromBase64Generator();
  message.setGenerator(stringGeneratorToPb(v.generator));

  return message;
}
