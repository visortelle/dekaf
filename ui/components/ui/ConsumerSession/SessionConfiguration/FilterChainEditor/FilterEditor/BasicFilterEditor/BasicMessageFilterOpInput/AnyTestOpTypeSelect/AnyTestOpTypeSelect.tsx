import React from 'react';
import s from './AnyTestOpTypeSelect.module.css'
import {
  AnyTestOp,
  TestOpArrayAll,
  TestOpArrayAny,
  TestOpMatchesJson
} from '../../../../../../basic-message-filter-types';
import Select from '../../../../../../../Select/Select';
import { v4 as uuid } from 'uuid';

const defaultIsCaseSensitive = false;

export type AnyTestOpTypeSelectProps = {
  value: AnyTestOp,
  onChange: (v: AnyTestOp) => void,
  isReadOnly?: boolean
};

const AnyTestOpTypeSelect: React.FC<AnyTestOpTypeSelectProps> = (props) => {
  return (
    <div className={s.AnyTestOpTypeSelect}>
      <Select<AnyTestOp['op']['type']>
        size='small'
        list={[
          { type: "item", title: "is defined", value: "TestOpIsDefined" },
          { type: "item", title: "is null", value: "TestOpIsNull" },
          {
            type: "group", title: "Boolean", items: [
              { type: "item", title: "is true", value: "TestOpBoolIsTrue" },
              { type: "item", title: "is false", value: "TestOpBoolIsFalse" },
            ]
          },
          {
            type: "group", title: "Number", items: [
              { type: "item", title: "= equals", value: "TestOpNumberEq" },
              { type: "item", title: "< less than", value: "TestOpNumberLt" },
              { type: "item", title: "≤ less than or equal to", value: "TestOpNumberLte" },
              { type: "item", title: "> greater than", value: "TestOpNumberGt" },
              { type: "item", title: "≥ greater than or equal to", value: "TestOpNumberGte" },
            ]
          },
          {
            type: "group", title: "String", items: [
              { type: "item", title: "equals string", value: "TestOpStringEquals" },
              { type: "item", title: "string includes", value: "TestOpStringIncludes" },
              { type: "item", title: "starts with", value: "TestOpStringStartsWith" },
              { type: "item", title: "ends with", value: "TestOpStringEndsWith" },
              { type: "item", title: "matches regex", value: "TestOpStringMatchesRegex" },
            ]
          },
          {
            type: "group", title: "Array", items: [
              { type: "item", title: "where every", value: "TestOpArrayAll" },
              { type: "item", title: "where some", value: "TestOpArrayAny" },
            ]
          },
          {
            type: "group", title: "JSON", items: [
              { type: "item", title: "JSON includes", value: "TestOpContainsJson" },
              { type: "item", title: "equals JSON", value: "TestOpEqualsJson" },
              { type: "item", title: "matches JSON", value: "TestOpMatchesJson" },
            ]
          },
        ]}
        value={props.value.op.type}
        onChange={(v) => {
          switch (v) {
            case "TestOpAlwaysOk":
              props.onChange({ ...props.value, op: { type: "TestOpAlwaysOk" } });
              break;
            case "TestOpIsDefined":
              props.onChange({ ...props.value, op: { type: "TestOpIsDefined" } });
              break;
            case "TestOpIsNull":
              props.onChange({ ...props.value, op: { type: "TestOpIsNull" } });
              break;
            case "TestOpBoolIsFalse":
              props.onChange({ ...props.value, op: { type: "TestOpBoolIsFalse" } });
              break;
            case "TestOpBoolIsTrue":
              props.onChange({ ...props.value, op: { type: "TestOpBoolIsTrue" } });
              break;
            case "TestOpNumberEq": {
              if (numberOps.includes(props.value.op.type)) {
                props.onChange({ ...props.value, op: { type: "TestOpNumberEq", eq: getStringOpValue(props.value.op) } });
                return;
              }

              props.onChange({ ...props.value, op: { type: "TestOpNumberEq", eq: "0" } });
              break;
            }
            case "TestOpNumberLt": {
              if (numberOps.includes(props.value.op.type)) {
                props.onChange({ ...props.value, op: { type: "TestOpNumberLt", lt: getStringOpValue(props.value.op) } });
                return;
              }

              props.onChange({ ...props.value, op: { type: "TestOpNumberLt", lt: "0" } });
              break;
            }
            case "TestOpNumberLte": {
              if (numberOps.includes(props.value.op.type)) {
                props.onChange({ ...props.value, op: { type: "TestOpNumberLte", lte: getStringOpValue(props.value.op) } });
                return;
              }

              props.onChange({ ...props.value, op: { type: "TestOpNumberLte", lte: "0" } });
              break;
            }
            case "TestOpNumberGt": {
              if (numberOps.includes(props.value.op.type)) {
                props.onChange({ ...props.value, op: { type: "TestOpNumberGt", gt: getStringOpValue(props.value.op) } });
                return;
              }

              props.onChange({ ...props.value, op: { type: "TestOpNumberGt", gt: "0" } });
              break;
            }
            case "TestOpNumberGte": {
              if (numberOps.includes(props.value.op.type)) {
                props.onChange({ ...props.value, op: { type: "TestOpNumberGte", gte: getStringOpValue(props.value.op) } });
                return;
              }

              props.onChange({ ...props.value, op: { type: "TestOpNumberGte", gte: "0" } });
              break;
            }
            case "TestOpStringEquals": {
              if (stringOps.includes(props.value.op.type)) {
                props.onChange({
                  ...props.value,
                  op: {
                    type: "TestOpStringEquals",
                    equals: getStringOpValue(props.value.op),
                    isCaseInsensitive: defaultIsCaseSensitive
                  }
                });
                return;
              }

              props.onChange({
                ...props.value,
                op: {
                  type: "TestOpStringEquals",
                  equals: "",
                  isCaseInsensitive: defaultIsCaseSensitive
                }
              });
              break;
            }
            case "TestOpStringIncludes": {
              if (stringOps.includes(props.value.op.type)) {
                props.onChange({
                  ...props.value,
                  op: {
                    type: "TestOpStringIncludes",
                    includes: getStringOpValue(props.value.op),
                    isCaseInsensitive: defaultIsCaseSensitive
                  }
                });
                return;
              }

              props.onChange({
                ...props.value,
                op: {
                  type: "TestOpStringIncludes",
                  includes: "",
                  isCaseInsensitive: defaultIsCaseSensitive
                }
              });
              break;
            }
            case "TestOpStringStartsWith": {
              if (stringOps.includes(props.value.op.type)) {
                props.onChange({
                  ...props.value,
                  op: {
                    type: "TestOpStringStartsWith",
                    startsWith: getStringOpValue(props.value.op),
                    isCaseInsensitive: defaultIsCaseSensitive
                  }
                });
                return;
              }

              props.onChange({
                ...props.value,
                op: {
                  type: "TestOpStringStartsWith",
                  startsWith: "",
                  isCaseInsensitive: defaultIsCaseSensitive
                }
              });
              break;
            }
            case "TestOpStringEndsWith": {
              if (stringOps.includes(props.value.op.type)) {
                props.onChange({
                  ...props.value,
                  op: {
                    type: "TestOpStringEndsWith",
                    endsWith: getStringOpValue(props.value.op),
                    isCaseInsensitive: defaultIsCaseSensitive
                  }
                });
                return;
              }

              props.onChange({
                ...props.value,
                op: {
                  type: "TestOpStringEndsWith",
                  endsWith: "",
                  isCaseInsensitive: defaultIsCaseSensitive
                }
              });
              break;

            }
            case "TestOpStringMatchesRegex": {
              const defaultFlags = 'gm';

              if (stringOps.includes(props.value.op.type)) {
                props.onChange({
                  ...props.value,
                  op: {
                    type: "TestOpStringMatchesRegex",
                    pattern: getStringOpValue(props.value.op),
                    flags: defaultFlags
                  }
                });
                return;
              }

              props.onChange({
                ...props.value,
                op: {
                  type: "TestOpStringMatchesRegex",
                  pattern: "",
                  flags: defaultFlags
                }
              });
              break;
            }
            case "TestOpContainsJson": {
              if (jsonOps.includes(props.value.op.type)) {
                props.onChange({
                  ...props.value,
                  op: {
                    type: "TestOpContainsJson",
                    containsJson: getStringOpValue(props.value.op),
                    isCaseInsensitive: false
                  }
                });
                return;
              }

              props.onChange({
                ...props.value,
                op: {
                  type: "TestOpContainsJson",
                  containsJson: "",
                  isCaseInsensitive: false
                }
              });

              break;
            }
            case "TestOpEqualsJson": {
              if (jsonOps.includes(props.value.op.type)) {
                props.onChange({
                  ...props.value,
                  op: {
                    type: "TestOpEqualsJson",
                    equalsJson: getStringOpValue(props.value.op)
                  }
                });
                return;
              }

              props.onChange({
                ...props.value,
                op: {
                  type: "TestOpEqualsJson",
                  equalsJson: ""
                }
              });

              break;
            }
            case "TestOpMatchesJson": {
              if (jsonOps.includes(props.value.op.type)) {
                props.onChange({
                  ...props.value,
                  op: {
                    type: "TestOpMatchesJson",
                    matchesJson: getStringOpValue(props.value.op)
                  }
                });
                return;
              }

              props.onChange({
                ...props.value,
                op: {
                  type: "TestOpMatchesJson",
                  matchesJson: ""
                }
              });

              break;
            }
            case "TestOpArrayAll": {
              if (props.value.op.type === "TestOpArrayAny") {
                const newOp: TestOpArrayAll = {
                  ...props.value.op,
                  type: "TestOpArrayAll"
                };
                props.onChange({ ...props.value, op: newOp });
              } else {
                props.onChange({
                  ...props.value,
                  op: {
                    type: "TestOpArrayAll",
                    itemFieldTarget: undefined,
                    testItemOp: {
                      type: "BasicMessageFilterOp",
                      isEnabled: true,
                      isNegated: false,
                      op: { type: "AnyTestOp", op: { type: "TestOpIsDefined" } },
                      reactKey: uuid()
                    }
                  }
                });
              }

              break;
            }

            case "TestOpArrayAny": {
              if (props.value.op.type === "TestOpArrayAll") {
                const newOp: TestOpArrayAny = {
                  ...props.value.op,
                  type: "TestOpArrayAny"
                };
                props.onChange({ ...props.value, op: newOp });
              } else {
                props.onChange({
                  ...props.value,
                  op: {
                    type: "TestOpArrayAny",
                    itemFieldTarget: undefined,
                    testItemOp: {
                      type: "BasicMessageFilterOp",
                      isEnabled: true,
                      isNegated: false,
                      op: { type: "AnyTestOp", op: { type: "TestOpIsDefined" } },
                      reactKey: uuid()
                    }
                  }
                });
              }

              break;
            }
          }
        }}
        isReadOnly={props.isReadOnly}
      />
    </div>
  );
}

const stringOps: AnyTestOp['op']['type'][] = [
  'TestOpStringEquals',
  'TestOpStringIncludes',
  'TestOpStringStartsWith',
  'TestOpStringEndsWith',
  'TestOpStringMatchesRegex'
];

const numberOps: AnyTestOp['op']['type'][] = [
  'TestOpNumberEq',
  'TestOpNumberLt',
  'TestOpNumberLte',
  'TestOpNumberGt',
  'TestOpNumberGte',
];

const jsonOps: AnyTestOp['op']['type'][] = [
  'TestOpContainsJson',
  'TestOpEqualsJson',
  'TestOpMatchesJson',
];

export function getStringOpValue(op: AnyTestOp['op']): string {
  switch (op.type) {
    case "TestOpNumberEq": return op.eq;
    case "TestOpNumberLt": return op.lt;
    case "TestOpNumberLte": return op.lte;
    case "TestOpNumberGt": return op.gt;
    case "TestOpNumberGte": return op.gte;

    case "TestOpStringEquals": return op.equals;
    case "TestOpStringIncludes": return op.includes;
    case "TestOpStringStartsWith": return op.startsWith;
    case "TestOpStringEndsWith": return op.endsWith;
    case "TestOpStringMatchesRegex": return op.pattern;

    case "TestOpEqualsJson": return op.equalsJson;
    case "TestOpContainsJson": return op.containsJson;
    case "TestOpMatchesJson": return op.matchesJson;

    default: throw new Error(`Can't get unary value of ${op.type}`);
  }
}

export default AnyTestOpTypeSelect;
