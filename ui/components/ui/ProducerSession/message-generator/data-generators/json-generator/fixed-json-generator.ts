import * as pb from '../../../../../../grpc-web/tools/teal/pulsar/ui/producer/v1/producer_pb';

export type FixedJsonGenerator = {
  type: 'fixed-json-generator',
  json: string
};

export function fixedJsonGeneratorFromPb(v: pb.FixedJsonGenerator): FixedJsonGenerator {
  return {
    type: 'fixed-json-generator',
    json: v.getJson()
  };
}

export function fixedJsonGeneratorToPb(v: FixedJsonGenerator): pb.FixedJsonGenerator {
  const message = new pb.FixedJsonGenerator();
  message.setJson(v.json);

  return message;
}
