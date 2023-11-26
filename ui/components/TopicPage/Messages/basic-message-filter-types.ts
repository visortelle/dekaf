export type TestOpAlwaysOk = {
  type: "TestOpAlwaysOk"
};

export type TestOpIsDefined = {
  type: "TestOpIsDefined"
}

export type TestOpIsNull = {
  type: "TestOpIsNull"
}

export type TestOpBoolEquals = {
  type: "TestOpBoolEquals",
  equals: boolean
}

export type TestOpStringEquals = {
  type: "TestOpStringEquals",
  equals: string,
  isCaseInsensitive: boolean
}

export type TestOpStringIncludes = {
  type: "TestOpStringIncludes",
  includes: string,
  isCaseInsensitive: boolean
}

export type TestOpStringStartsWith = {
  type: "TestOpStringStartsWith",
  startsWith: string,
  isCaseInsensitive: boolean
}

export type TestOpStringEndsWith = {
  type: "TestOpStringEndsWith",
  endsWith: string,
  isCaseInsensitive: boolean
}

export type TestOpStringMatchesRegex = {
  type: "TestOpStringMatchesRegex",
  pattern: string,
  flags: string
}

export type TestOpArraySize = {
  type: "TestOpArraySize",
  // TODO
}

export type TestOpArrayItemsCount = {
  type: "TestOpArrayItemsCount"
  // TODO
}

export type TestOpArrayAny = {
  type: "TestOpArrayAny",
  testItemOp: BasicMessageFilterOp
}

export type TestOpArrayAll = {
  type: "TestOpArrayAll",
  testItemOp: BasicMessageFilterOp
}

export type TestOpObjectHasKey = {
  type: "TestOpObjectHasKey"
  testKeyOp: BasicMessageFilterOp
}

export type TestOpObjectHasValue = {
  type: "TestOpObjectHasValue",
  testValueOp: BasicMessageFilterOp
}

export type TestOpObjectHasValueAtKey = {
  type: "TestOpObjectHasValueAtKey",
  key: string,
  testValueOp: BasicMessageFilterOp
}

export type TestOpObjectSize = {
  type: "TestOpObjectSize",
  // TODO
}

export type AnyTestOp = {
  type: "AnyTestOp",
  op:
  TestOpAlwaysOk |
  TestOpIsDefined |
  TestOpIsNull |
  TestOpBoolEquals |
  TestOpStringEquals |
  TestOpStringIncludes |
  TestOpStringStartsWith |
  TestOpStringEndsWith |
  TestOpStringMatchesRegex |
  TestOpArraySize |
  TestOpArrayItemsCount |
  TestOpArrayAny |
  TestOpArrayAll |
  TestOpObjectHasKey |
  TestOpObjectHasValue |
  TestOpObjectHasValueAtKey |
  TestOpObjectSize
}

export type BasicMessageFilterBracesMode = "all" | "any";

export type BasicMessageFilterBraces = {
  type: "BasicMessageFilterBraces",
  mode: BasicMessageFilterBracesMode,
  ops: BasicMessageFilterOp[]
}

export type BasicMessageFilterOp = {
  type: "BasicMessageFilterOp",
  isEnabled: boolean,
  isNegated: boolean,
  op: AnyTestOp | BasicMessageFilterBraces
  reactKey: string
}

export type BasicMessageFilterKeyTarget = {
  type: "BasicMessageFilterKeyTarget",
  jsonFieldSelector?: string
}

export type BasicMessageFilterValueTarget = {
  type: "BasicMessageFilterValueTarget",
  jsonFieldSelector?: string
}

export type BasicMessageFilterPropertyTarget = {
  type: "BasicMessageFilterPropertyTarget",
  propertyKey: string
}

export type BasicMessageFilterSessionContextStateTarget = {
  type: "BasicMessageFilterSessionContextStateTarget",
  jsonFieldSelector?: string
}

export type BasicMessageFilterTarget = {
  type: "BasicMessageFilterTarget",
  target:
  BasicMessageFilterKeyTarget |
  BasicMessageFilterValueTarget |
  BasicMessageFilterPropertyTarget |
  BasicMessageFilterSessionContextStateTarget
}

export type BasicMessageFilter = {
  type: "BasicMessageFilter",
  target: BasicMessageFilterTarget,
  op: BasicMessageFilterOp
}
