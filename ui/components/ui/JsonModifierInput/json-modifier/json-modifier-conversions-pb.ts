import * as pb from '../../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb';
import { JsJsonModifier, JsonModifier } from './json-modifier-types';

export function jsJsonModifierFromPb(v: pb.JsJsonModifier): JsJsonModifier {
  return {
    type: "JsJsonModifier",
    jsCode: v.getJsCode()
  }
}

export function jsJsonModifierToPb(v: JsJsonModifier): pb.JsJsonModifier {
  const resultPb = new pb.JsJsonModifier();
  resultPb.setJsCode(v.jsCode);

  return resultPb;
}

export function jsonModifierFromPb(v: pb.JsonModifier): JsonModifier {
  let modifier: JsonModifier['modifier'];

  switch (v.getModifierCase()) {
    case pb.JsonModifier.ModifierCase.MODIFIER_JS: {
      modifier = jsJsonModifierFromPb(v.getModifierJs()!)
      break;
    }
    default: throw new Error(`Unsupported JsonModifier type: ${v.getModifierCase()}`)
  }

  return {
    modifier
  };
}

export function jsonModifierToPb(v: JsonModifier): pb.JsonModifier {
  const resultPb = new pb.JsonModifier();

  switch (v.modifier.type) {
    case "JsJsonModifier": {
      resultPb.setModifierJs(jsJsonModifierToPb(v.modifier));
      break;
    }
    default: throw new Error(`Unsupported JsonModifier type: ${v.modifier.type}`)
  }

  return resultPb;
}
