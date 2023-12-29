export type JsJsonModifier = {
  type: "JsJsonModifier",

  // A function body code with the following signature: "(v) => v"
  jsCode: string
};

export type JsonModifier = {
  modifier: JsJsonModifier
};
