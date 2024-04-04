import * as pb from '../../../../../../grpc-web/tools/teal/pulsar/ui/producer/v1/producer_pb';

export type ValueFromTopicSchemaGenerator = {
  type: 'value-from-topic-schema'
};

export function valueFromTopicSchemaGeneratorFromPb(v: pb.ValueFromTopicSchemaGenerator): ValueFromTopicSchemaGenerator {
  return {
    type: 'value-from-topic-schema'
  };
}

export function valueFromTopicSchemaGeneratorToPb(v: ValueFromTopicSchemaGenerator): pb.ValueFromTopicSchemaGenerator {
  const generatorPb = new pb.ValueFromTopicSchemaGenerator();

  return generatorPb;
}
