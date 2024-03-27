import * as pb from '../../../../../../grpc-web/tools/teal/pulsar/ui/producer/v1/producer_pb';

export type FixedStringGenerator = {
  type: 'fixed-string-generator',
  string: string
};

export function fixedStringGeneratorFromPb(v: pb.FixedStringGenerator): FixedStringGenerator {
  return {
    type: 'fixed-string-generator',
    string: v.getString()
  };
}

export function fixedStringGeneratorToPb(v: FixedStringGenerator): pb.FixedStringGenerator {
  const message = new pb.FixedStringGenerator();
  message.setString(v.string);

  return message;
}
