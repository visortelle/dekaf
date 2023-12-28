import { StringValue } from "google-protobuf/google/protobuf/wrappers_pb";
import * as pb from "../../../../grpc-web/tools/teal/pulsar/ui/api/v1/consumer_pb";
import { AnyTestOp, BasicMessageFilterBraces, BasicMessageFilterBracesMode, BasicMessageFilterKeyTarget, BasicMessageFilterOp, BasicMessageFilterPropertyTarget, BasicMessageFilterSessionContextStateTarget, BasicMessageFilterTarget, BasicMessageFilterValueTarget, TestOpAlwaysOk, TestOpArrayAll, TestOpArrayAny, TestOpIsDefined, TestOpIsNull, TestOpStringEndsWith, TestOpStringEquals, TestOpStringIncludes, TestOpStringMatchesRegex, TestOpStringStartsWith, BasicMessageFilter, BasicMessageFilterFieldTarget, TestOpBoolIsTrue, TestOpBoolIsFalse, TestOpNumberEq, TestOpNumberLt, TestOpNumberLte, TestOpNumberGt, TestOpNumberGte } from "../basic-message-filter-types";
import { v4 as uuid } from 'uuid';

export function testOpAlwaysOkFromPb(v: pb.TestOpAlwaysOk): TestOpAlwaysOk {
  return {
    type: "TestOpAlwaysOk"
  }
}

export function testOpAlwaysOkToPb(v: TestOpAlwaysOk): pb.TestOpAlwaysOk {
  const resultPb = new pb.TestOpAlwaysOk();
  return resultPb;
}

export function testOpIsDefinedFromPb(v: pb.TestOpIsDefined): TestOpIsDefined {
  return {
    type: "TestOpIsDefined",
  }
}

export function testOpIsDefinedToPb(v: TestOpIsDefined): pb.TestOpIsDefined {
  const resultPb = new pb.TestOpIsDefined();
  return resultPb;
}

export function testOpIsNullFromPb(v: pb.TestOpIsNull): TestOpIsNull {
  return {
    type: "TestOpIsNull",
  }
}

export function testOpIsNullToPb(v: TestOpIsNull): pb.TestOpIsNull {
  const resultPb = new pb.TestOpIsNull();
  return resultPb;
}

export function testOpBoolIsTrueFromPb(v: pb.TestOpBoolIsTrue): TestOpBoolIsTrue {
  return { type: "TestOpBoolIsTrue" };
}

export function testOpBoolIsTrueToPb(v: TestOpBoolIsTrue): pb.TestOpBoolIsTrue {
  const resultPb = new pb.TestOpBoolIsTrue();
  return resultPb;
}

export function testOpBoolIsFalseFromPb(v: pb.TestOpBoolIsFalse): TestOpBoolIsFalse {
  return { type: "TestOpBoolIsFalse" };
}

export function testOpBoolIsFalseToPb(v: TestOpBoolIsFalse): pb.TestOpBoolIsFalse {
  const resultPb = new pb.TestOpBoolIsFalse();
  return resultPb;
}

export function testOpNumberEqFromPb(v: pb.TestOpNumberEq): TestOpNumberEq {
  return {
    type: "TestOpNumberEq",
    eq: v.getEq(),
  }
}

export function testOpNumberEqToPb(v: TestOpNumberEq): pb.TestOpNumberEq {
  const resultPb = new pb.TestOpNumberEq();
  resultPb.setEq(v.eq);

  return resultPb;
}

export function testOpNumberLtFromPb(v: pb.TestOpNumberLt): TestOpNumberLt {
  return {
    type: "TestOpNumberLt",
    lt: v.getLt(),
  }
}

export function testOpNumberLtToPb(v: TestOpNumberLt): pb.TestOpNumberLt {
  const resultPb = new pb.TestOpNumberLt();
  resultPb.setLt(v.lt);

  return resultPb;
}

export function testOpNumberLteFromPb(v: pb.TestOpNumberLte): TestOpNumberLte {
  return {
    type: "TestOpNumberLte",
    lte: v.getLte(),
  }
}

export function testOpNumberLteToPb(v: TestOpNumberLte): pb.TestOpNumberLte {
  const resultPb = new pb.TestOpNumberLte();
  resultPb.setLte(v.lte);

  return resultPb;
}

export function testOpNumberGtFromPb(v: pb.TestOpNumberGt): TestOpNumberGt {
  return {
    type: "TestOpNumberGt",
    gt: v.getGt(),
  }
}

export function testOpNumberGtToPb(v: TestOpNumberGt): pb.TestOpNumberGt {
  const resultPb = new pb.TestOpNumberGt();
  resultPb.setGt(v.gt);

  return resultPb;
}

export function testOpNumberGteFromPb(v: pb.TestOpNumberGte): TestOpNumberGte {
  return {
    type: "TestOpNumberGte",
    gte: v.getGte(),
  }
}

export function testOpNumberGteToPb(v: TestOpNumberGte): pb.TestOpNumberGte {
  const resultPb = new pb.TestOpNumberGte();
  resultPb.setGte(v.gte);

  return resultPb;
}

export function testOpStringEqualsFromPb(v: pb.TestOpStringEquals): TestOpStringEquals {
  return {
    type: "TestOpStringEquals",
    equals: v.getEquals(),
    isCaseInsensitive: v.getIsCaseInsensitive()
  }
}

export function testOpStringEqualsToPb(v: TestOpStringEquals): pb.TestOpStringEquals {
  const resultPb = new pb.TestOpStringEquals();
  resultPb.setEquals(v.equals);
  resultPb.setIsCaseInsensitive(v.isCaseInsensitive);

  return resultPb;
}

export function testOpStringIncludesFromPb(v: pb.TestOpStringIncludes): TestOpStringIncludes {
  return {
    type: "TestOpStringIncludes",
    includes: v.getIncludes(),
    isCaseInsensitive: v.getIsCaseInsensitive()
  }
}

export function testOpStringIncludesToPb(v: TestOpStringIncludes): pb.TestOpStringIncludes {
  const resultPb = new pb.TestOpStringIncludes();
  resultPb.setIncludes(v.includes);
  resultPb.setIsCaseInsensitive(v.isCaseInsensitive);

  return resultPb;
}

export function testOpStringStartsWithFromPb(v: pb.TestOpStringStartsWith): TestOpStringStartsWith {
  return {
    type: "TestOpStringStartsWith",
    startsWith: v.getStartsWith(),
    isCaseInsensitive: v.getIsCaseInsensitive()
  }
}

export function testOpStringStartsWithToPb(v: TestOpStringStartsWith): pb.TestOpStringStartsWith {
  const resultPb = new pb.TestOpStringStartsWith();
  resultPb.setStartsWith(v.startsWith);
  resultPb.setIsCaseInsensitive(v.isCaseInsensitive);

  return resultPb;
}

export function testOpStringEndsWithFromPb(v: pb.TestOpStringEndsWith): TestOpStringEndsWith {
  return {
    type: "TestOpStringEndsWith",
    endsWith: v.getEndsWith(),
    isCaseInsensitive: v.getIsCaseInsensitive()
  }
}

export function testOpStringEndsWithToPb(v: TestOpStringEndsWith): pb.TestOpStringEndsWith {
  const resultPb = new pb.TestOpStringEndsWith();
  resultPb.setEndsWith(v.endsWith);
  resultPb.setIsCaseInsensitive(v.isCaseInsensitive);

  return resultPb;
}

export function testOpStringMatchesRegexFromPb(v: pb.TestOpStringMatchesRegex): TestOpStringMatchesRegex {
  return {
    type: "TestOpStringMatchesRegex",
    pattern: v.getPattern(),
    flags: v.getFlags()
  }
}

export function testOpStringMatchesRegexToPb(v: TestOpStringMatchesRegex): pb.TestOpStringMatchesRegex {
  const resultPb = new pb.TestOpStringMatchesRegex();
  resultPb.setPattern(v.pattern);
  resultPb.setFlags(v.flags);

  return resultPb;
}

export function testOpArrayAnyFromPb(v: pb.TestOpArrayAny): TestOpArrayAny {
  const itemFieldTargetPb = v.getItemFieldTarget();

  return {
    type: "TestOpArrayAny",
    testItemOp: basicMessageFilterOpFromPb(v.getTestItemOp()!),
    itemFieldTarget: itemFieldTargetPb === undefined ? undefined : basicMessageFilterFieldTargetFromPb(itemFieldTargetPb)
  }
}

export function testOpArrayAnyToPb(v: TestOpArrayAny): pb.TestOpArrayAny {
  const resultPb = new pb.TestOpArrayAny();
  resultPb.setTestItemOp(basicMessageFilterOpToPb(v.testItemOp));

  if (v.itemFieldTarget !== undefined) {
    resultPb.setItemFieldTarget(basicMessageFilterFieldTargetToPb(v.itemFieldTarget));
  }

  return resultPb;
}

export function testOpArrayAllFromPb(v: pb.TestOpArrayAll): TestOpArrayAll {
  const itemFieldTargetPb = v.getItemFieldTarget();

  return {
    type: "TestOpArrayAll",
    testItemOp: basicMessageFilterOpFromPb(v.getTestItemOp()!),
    itemFieldTarget: itemFieldTargetPb === undefined ? undefined : basicMessageFilterFieldTargetFromPb(itemFieldTargetPb)
  }
}

export function testOpArrayAllToPb(v: TestOpArrayAll): pb.TestOpArrayAll {
  const resultPb = new pb.TestOpArrayAll();
  resultPb.setTestItemOp(basicMessageFilterOpToPb(v.testItemOp));

  if (v.itemFieldTarget !== undefined) {
    resultPb.setItemFieldTarget(basicMessageFilterFieldTargetToPb(v.itemFieldTarget));
  }

  return resultPb;
}

export function anyTestOpFromPb(v: pb.AnyTestOp): AnyTestOp {
  let op: AnyTestOp['op'];

  switch (v.getOpCase()) {
    case pb.AnyTestOp.OpCase.OP_ALWAYS_OK: op = testOpAlwaysOkFromPb(v.getOpAlwaysOk()!); break;
    case pb.AnyTestOp.OpCase.OP_IS_DEFINED: op = testOpIsDefinedFromPb(v.getOpIsDefined()!); break;
    case pb.AnyTestOp.OpCase.OP_IS_NULL: op = testOpIsNullFromPb(v.getOpIsNull()!); break;
    case pb.AnyTestOp.OpCase.OP_BOOL_IS_FALSE: op = testOpBoolIsFalseFromPb(v.getOpBoolIsFalse()!); break;
    case pb.AnyTestOp.OpCase.OP_BOOL_IS_TRUE: op = testOpBoolIsTrueFromPb(v.getOpBoolIsTrue()!); break;
    case pb.AnyTestOp.OpCase.OP_NUMBER_EQ: op = testOpNumberEqFromPb(v.getOpNumberEq()!); break;
    case pb.AnyTestOp.OpCase.OP_NUMBER_LT: op = testOpNumberLtFromPb(v.getOpNumberLt()!); break;
    case pb.AnyTestOp.OpCase.OP_NUMBER_LTE: op = testOpNumberLteFromPb(v.getOpNumberLte()!); break;
    case pb.AnyTestOp.OpCase.OP_NUMBER_GT: op = testOpNumberGtFromPb(v.getOpNumberGt()!); break;
    case pb.AnyTestOp.OpCase.OP_NUMBER_GTE: op = testOpNumberGteFromPb(v.getOpNumberGte()!); break;
    case pb.AnyTestOp.OpCase.OP_STRING_EQUALS: op = testOpStringEqualsFromPb(v.getOpStringEquals()!); break;
    case pb.AnyTestOp.OpCase.OP_STRING_INCLUDES: op = testOpStringIncludesFromPb(v.getOpStringIncludes()!); break;
    case pb.AnyTestOp.OpCase.OP_STRING_STARTS_WITH: op = testOpStringStartsWithFromPb(v.getOpStringStartsWith()!); break;
    case pb.AnyTestOp.OpCase.OP_STRING_ENDS_WITH: op = testOpStringEndsWithFromPb(v.getOpStringEndsWith()!); break;
    case pb.AnyTestOp.OpCase.OP_STRING_MATCHES_REGEX: op = testOpStringMatchesRegexFromPb(v.getOpStringMatchesRegex()!); break;
    case pb.AnyTestOp.OpCase.OP_ARRAY_ANY: op = testOpArrayAnyFromPb(v.getOpArrayAny()!); break;
    case pb.AnyTestOp.OpCase.OP_ARRAY_ALL: op = testOpArrayAllFromPb(v.getOpArrayAll()!); break;
    default: throw new Error("Failed to convert AnyTestOp. Unknown type.");
  }

  return {
    type: "AnyTestOp",
    op
  }
}

export function anyTestOpToPb(v: AnyTestOp): pb.AnyTestOp {
  const resultPb = new pb.AnyTestOp();

  switch (v.op.type) {
    case "TestOpAlwaysOk": resultPb.setOpAlwaysOk(testOpAlwaysOkToPb(v.op)); break;
    case "TestOpIsDefined": resultPb.setOpIsDefined(testOpIsDefinedToPb(v.op)); break;
    case "TestOpIsNull": resultPb.setOpIsNull(testOpIsNullToPb(v.op)); break;
    case "TestOpBoolIsFalse": resultPb.setOpBoolIsFalse(testOpBoolIsFalseToPb(v.op)); break;
    case "TestOpBoolIsTrue": resultPb.setOpBoolIsTrue(testOpBoolIsTrueToPb(v.op)); break;
    case "TestOpNumberEq": resultPb.setOpNumberEq(testOpNumberEqToPb(v.op)); break;
    case "TestOpNumberLt": resultPb.setOpNumberLt(testOpNumberLtToPb(v.op)); break;
    case "TestOpNumberLte": resultPb.setOpNumberLte(testOpNumberLteToPb(v.op)); break;
    case "TestOpNumberGt": resultPb.setOpNumberGt(testOpNumberGtToPb(v.op)); break;
    case "TestOpNumberGte": resultPb.setOpNumberGte(testOpNumberGteToPb(v.op)); break;
    case "TestOpStringEquals": resultPb.setOpStringEquals(testOpStringEqualsToPb(v.op)); break;
    case "TestOpStringIncludes": resultPb.setOpStringIncludes(testOpStringIncludesToPb(v.op)); break;
    case "TestOpStringStartsWith": resultPb.setOpStringStartsWith(testOpStringStartsWithToPb(v.op)); break;
    case "TestOpStringEndsWith": resultPb.setOpStringEndsWith(testOpStringEndsWithToPb(v.op)); break;
    case "TestOpStringMatchesRegex": resultPb.setOpStringMatchesRegex(testOpStringMatchesRegexToPb(v.op)); break;
    case "TestOpArrayAny": resultPb.setOpArrayAny(testOpArrayAnyToPb(v.op)); break;
    case "TestOpArrayAll": resultPb.setOpArrayAll(testOpArrayAllToPb(v.op)); break;
    default: throw new Error("Failed to convert AnyTestOp. Unknown type.");
  }

  return resultPb;
}

export function basicMessageFilterBracesModeFromPb(v: pb.BasicMessageFilterBracesMode): BasicMessageFilterBracesMode {
  switch (v) {
    case pb.BasicMessageFilterBracesMode.BASIC_MESSAGE_FILTER_BRACES_MODE_ALL:
      return "all";
    case pb.BasicMessageFilterBracesMode.BASIC_MESSAGE_FILTER_BRACES_MODE_ANY:
      return "any";
    default: throw new Error("Failed to convert BasicMessageFilterBracesMode. Unknown type.");
  }
}

export function basicMessageFilterBracesModeToPb(v: BasicMessageFilterBracesMode): pb.BasicMessageFilterBracesMode {
  switch (v) {
    case "all":
      return pb.BasicMessageFilterBracesMode.BASIC_MESSAGE_FILTER_BRACES_MODE_ALL;
    case "any":
      return pb.BasicMessageFilterBracesMode.BASIC_MESSAGE_FILTER_BRACES_MODE_ANY;
    default: throw new Error("Failed to convert BasicMessageFilterBracesMode. Unknown type.");
  }
}

export function basicMessageFilterBracesFromPb(v: pb.BasicMessageFilterBraces): BasicMessageFilterBraces {
  return {
    type: "BasicMessageFilterBraces",
    mode: basicMessageFilterBracesModeFromPb(v.getMode()),
    ops: v.getOpsList().map((op) => basicMessageFilterOpFromPb(op))
  }
}

export function basicMessageFilterBracesToPb(v: BasicMessageFilterBraces): pb.BasicMessageFilterBraces {
  const resultPb = new pb.BasicMessageFilterBraces();
  resultPb.setMode(basicMessageFilterBracesModeToPb(v.mode));
  resultPb.setOpsList(v.ops.map(basicMessageFilterOpToPb));

  return resultPb;
}

export function basicMessageFilterOpFromPb(v: pb.BasicMessageFilterOp): BasicMessageFilterOp {
  let op: BasicMessageFilterOp['op'];

  switch (v.getOpCase()) {
    case pb.BasicMessageFilterOp.OpCase.OP_ANY_TEST_OP:
      op = anyTestOpFromPb(v.getOpAnyTestOp()!); break;
    case pb.BasicMessageFilterOp.OpCase.OP_BRACES:
      op = basicMessageFilterBracesFromPb(v.getOpBraces()!); break;
    default: throw new Error("Failed to convert BasicMessageFilterOp. Unknown type.");
  }

  return {
    "type": "BasicMessageFilterOp",
    isEnabled: v.getIsEnabled(),
    isNegated: v.getIsNegated(),
    op,
    reactKey: uuid()
  }
}

export function basicMessageFilterOpToPb(v: BasicMessageFilterOp): pb.BasicMessageFilterOp {
  const resultPb = new pb.BasicMessageFilterOp();

  resultPb.setIsEnabled(v.isEnabled);
  resultPb.setIsNegated(v.isNegated);

  switch (v.op.type) {
    case "AnyTestOp":
      resultPb.setOpAnyTestOp(anyTestOpToPb(v.op));
      break;
    case "BasicMessageFilterBraces":
      resultPb.setOpBraces(basicMessageFilterBracesToPb(v.op));
      break;
    default: throw new Error("Failed to convert BasicMessageFilterOp. Unknown type.");
  }

  return resultPb;
}

export function basicMessageFilterKeyTargetFromPb(v: pb.BasicMessageFilterKeyTarget): BasicMessageFilterKeyTarget {
  return {
    type: "BasicMessageFilterKeyTarget",
    jsonFieldSelector: v.getJsonFieldSelector()?.getValue()
  }
}

export function basicMessageFilterKeyTargetToPb(v: BasicMessageFilterKeyTarget): pb.BasicMessageFilterKeyTarget {
  const resultPb = new pb.BasicMessageFilterKeyTarget();
  if (v.jsonFieldSelector !== undefined) {
    resultPb.setJsonFieldSelector(new StringValue().setValue(v.jsonFieldSelector));
  }

  return resultPb;
}

export function basicMessageFilterValueTargetFromPb(v: pb.BasicMessageFilterValueTarget): BasicMessageFilterValueTarget {
  return {
    type: "BasicMessageFilterValueTarget",
    jsonFieldSelector: v.getJsonFieldSelector()?.getValue()
  }
}

export function basicMessageFilterValueTargetToPb(v: BasicMessageFilterValueTarget): pb.BasicMessageFilterValueTarget {
  const resultPb = new pb.BasicMessageFilterValueTarget();
  if (v.jsonFieldSelector !== undefined) {
    resultPb.setJsonFieldSelector(new StringValue().setValue(v.jsonFieldSelector));
  }

  return resultPb;
}

export function basicMessageFilterPropertyTargetFromPb(v: pb.BasicMessageFilterPropertyTarget): BasicMessageFilterPropertyTarget {
  return {
    type: "BasicMessageFilterPropertyTarget",
    propertyKey: v.getPropertyKey()
  }
}

export function basicMessageFilterPropertyTargetToPb(v: BasicMessageFilterPropertyTarget): pb.BasicMessageFilterPropertyTarget {
  const resultPb = new pb.BasicMessageFilterPropertyTarget();
  resultPb.setPropertyKey(v.propertyKey);

  return resultPb;
}

export function basicMessageFilterSessionContextStateTargetFromPb(v: pb.BasicMessageFilterSessionContextStateTarget): BasicMessageFilterSessionContextStateTarget {
  return {
    type: "BasicMessageFilterSessionContextStateTarget",
    jsonFieldSelector: v.getJsonFieldSelector()?.getValue()
  }
}

export function basicMessageFilterSessionContextStateTargetToPb(v: BasicMessageFilterSessionContextStateTarget): pb.BasicMessageFilterSessionContextStateTarget {
  const resultPb = new pb.BasicMessageFilterSessionContextStateTarget();
  if (v.jsonFieldSelector !== undefined) {
    resultPb.setJsonFieldSelector(new StringValue().setValue(v.jsonFieldSelector));
  }

  return resultPb;
}

export function basicMessageFilterFieldTargetFromPb(v: pb.BasicMessageFilterFieldTarget): BasicMessageFilterFieldTarget {
  return {
    type: "BasicMessageFilterFieldTarget",
    jsonFieldSelector: v.getJsonFieldSelector()?.getValue()
  }
}

export function basicMessageFilterFieldTargetToPb(v: BasicMessageFilterFieldTarget): pb.BasicMessageFilterFieldTarget {
  const resultPb = new pb.BasicMessageFilterFieldTarget();
  if (v.jsonFieldSelector !== undefined) {
    resultPb.setJsonFieldSelector(new StringValue().setValue(v.jsonFieldSelector));
  }

  return resultPb;
}

export function basicMessageFilterTargetFromPb(v: pb.BasicMessageFilterTarget): BasicMessageFilterTarget {
  let target: BasicMessageFilterTarget['target'];

  switch (v.getTargetCase()) {
    case pb.BasicMessageFilterTarget.TargetCase.TARGET_KEY:
      target = basicMessageFilterKeyTargetFromPb(v.getTargetKey()!);
      break;
    case pb.BasicMessageFilterTarget.TargetCase.TARGET_PROPERTY:
      target = basicMessageFilterPropertyTargetFromPb(v.getTargetProperty()!);
      break;
    case pb.BasicMessageFilterTarget.TargetCase.TARGET_SESSION_CONTEXT_STATE:
      target = basicMessageFilterSessionContextStateTargetFromPb(v.getTargetSessionContextState()!);
      break;
    case pb.BasicMessageFilterTarget.TargetCase.TARGET_VALUE:
      target = basicMessageFilterValueTargetFromPb(v.getTargetValue()!);
      break;
    default: throw new Error("Unable to convert BasicMessageFilterTarget. Unknown type.");
  }

  return {
    type: "BasicMessageFilterTarget",
    target
  }
}

export function basicMessageFilterTargetToPb(v: BasicMessageFilterTarget): pb.BasicMessageFilterTarget {
  const resultPb = new pb.BasicMessageFilterTarget();

  switch (v.target.type) {
    case "BasicMessageFilterKeyTarget":
      resultPb.setTargetKey(basicMessageFilterKeyTargetToPb(v.target))
      break;
    case "BasicMessageFilterValueTarget":
      resultPb.setTargetValue(basicMessageFilterValueTargetToPb(v.target))
      break;
    case "BasicMessageFilterPropertyTarget":
      resultPb.setTargetProperty(basicMessageFilterPropertyTargetToPb(v.target))
      break;
    case "BasicMessageFilterSessionContextStateTarget":
      resultPb.setTargetSessionContextState(basicMessageFilterSessionContextStateTargetToPb(v.target))
      break;

    default: throw new Error("Unable to convert BasicMessageFilterTarget. Unknown type.");
  }

  return resultPb;
}

export function basicMessageFilterFromPb(v: pb.BasicMessageFilter): BasicMessageFilter {
  return {
    type: "BasicMessageFilter",
    op: basicMessageFilterOpFromPb(v.getOp()!)
  }
}

export function basicMessageFilterToPb(v: BasicMessageFilter): pb.BasicMessageFilter {
  const resultPb = new pb.BasicMessageFilter();
  resultPb.setOp(basicMessageFilterOpToPb(v.op));

  return resultPb;
}
