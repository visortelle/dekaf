import * as pb from '../../../../../../grpc-web/tools/teal/pulsar/ui/producer/v1/producer_pb';

export type JsJsonGenerator = {
  type: 'js-json-generator',
  jsCode: string
};

export function jsJsonGeneratorFromPb(v: pb.JsJsonGenerator): JsJsonGenerator {
  return {
    type: 'js-json-generator',
    jsCode: v.getJsCode()
  };
}

export function jsJsonGeneratorToPb(v: JsJsonGenerator): pb.JsJsonGenerator {
  const message = new pb.JsJsonGenerator();
  message.setJsCode(v.jsCode);

  return message;
}
