import * as pb from '../../../../../grpc-web/tools/teal/pulsar/ui/producer/v1/producer_pb';

export type ValueFromTopicSchemaGenerator = {
  type: 'value-from-topic-schema',
  topicFqn: string
};

export function valueFromTopicSchemaGeneratorFromPb(v: pb.ValueFromTopicSchemaGenerator): ValueFromTopicSchemaGenerator {
  return {
    type: 'value-from-topic-schema',
    topicFqn: v.getTopicFqn()
  };
}

export function valueFromTopicSchemaGeneratorToPb(v: ValueFromTopicSchemaGenerator): pb.ValueFromTopicSchemaGenerator {
  const generatorPb = new pb.ValueFromTopicSchemaGenerator();
  generatorPb.setTopicFqn(v.topicFqn);

  return generatorPb;
}
