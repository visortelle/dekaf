import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb';

export type UseLatestTopicSchema = {
  type: 'use-latest-topic-schema'
};

export function useLatestTopicSchemaFromPb(v: pb.Deserializer.UseLatestTopicSchema): UseLatestTopicSchema {
  return { type: 'use-latest-topic-schema' };
}

export function useLatestTopicSchemaToPb(v: UseLatestTopicSchema): pb.Deserializer.UseLatestTopicSchema {
  return new pb.Deserializer.UseLatestTopicSchema();
}

export type TreatBytesAsJson = {
  type: 'treat-bytes-as-json'
};

export function treatBytesAsJsonFromPb(v: pb.Deserializer.TreatBytesAsJson): TreatBytesAsJson {
  return { type: 'treat-bytes-as-json' };
}

export function treatBytesAsJsonToPb(v: TreatBytesAsJson): pb.Deserializer.TreatBytesAsJson {
  return new pb.Deserializer.TreatBytesAsJson();
}

export type Deserializer = {
  type: 'deserializer',
  deserializer: UseLatestTopicSchema | TreatBytesAsJson
};

export function deserializerFromPb(v: pb.Deserializer): Deserializer {
  let deserializer: Deserializer['deserializer'];
  switch (v.getDeserializerCase()) {
    case pb.Deserializer.DeserializerCase.DESERIALIZER_USE_LATEST_TOPIC_SCHEMA: {
      deserializer = { type: 'use-latest-topic-schema' };
      break;
    }
    case pb.Deserializer.DeserializerCase.DESERIALIZER_TREAT_BYTES_AS_JSON: {
      deserializer = { type: 'treat-bytes-as-json' };
      break;
    }
    default: throw new Error(`Unable to parse Deserializer`)
  }

  return {
    type: 'deserializer',
    deserializer
  }
}

export function deserializerToPb(v: Deserializer): pb.Deserializer {
  const resultPb = new pb.Deserializer();

  switch (v.deserializer.type) {
    case "use-latest-topic-schema": {
      resultPb.setDeserializerUseLatestTopicSchema(useLatestTopicSchemaToPb(v.deserializer));
      break;
    }
    case "treat-bytes-as-json": {
      resultPb.setDeserializerTreatBytesAsJson(treatBytesAsJsonToPb(v.deserializer));
      break;
    }
  }

  return resultPb;
}
