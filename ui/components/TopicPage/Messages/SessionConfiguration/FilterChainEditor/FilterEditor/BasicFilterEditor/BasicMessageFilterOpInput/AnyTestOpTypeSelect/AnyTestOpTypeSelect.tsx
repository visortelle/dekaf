import React from 'react';
import s from './AnyTestOpTypeSelect.module.css'
import { AnyTestOp, TestOpArrayAll, TestOpArrayAny } from '../../../../../../basic-message-filter-types';
import Select from '../../../../../../../../ui/Select/Select';
import { v4 as uuid } from 'uuid';

export type AnyTestOpTypeSelectProps = {
  value: AnyTestOp,
  onChange: (v: AnyTestOp) => void
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
            type: "group", title: "String", items: [
              { type: "item", title: "equals string", value: "TestOpStringEquals" },
              { type: "item", title: "includes", value: "TestOpStringIncludes" },
              { type: "item", title: "starts with", value: "TestOpStringStartsWith" },
              { type: "item", title: "ends with", value: "TestOpStringEndsWith" },
              { type: "item", title: "matches regex", value: "TestOpStringMatchesRegex" },
            ]
          },
          {
            type: "group", title: "List", items: [
              { type: "item", title: "where every", value: "TestOpArrayAll" },
              { type: "item", title: "where some", value: "TestOpArrayAny" },
            ]
          }
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
            case "TestOpStringEquals":
              props.onChange({ ...props.value, op: { type: "TestOpStringEquals", equals: "", isCaseInsensitive: false } });
              break;
            case "TestOpStringIncludes":
              props.onChange({ ...props.value, op: { type: "TestOpStringIncludes", includes: "", isCaseInsensitive: false } });
              break;
            case "TestOpStringStartsWith":
              props.onChange({ ...props.value, op: { type: "TestOpStringStartsWith", startsWith: "", isCaseInsensitive: false } });
              break;
            case "TestOpStringEndsWith":
              props.onChange({ ...props.value, op: { type: "TestOpStringEndsWith", endsWith: "", isCaseInsensitive: false } });
              break;
            case "TestOpStringMatchesRegex":
              props.onChange({ ...props.value, op: { type: "TestOpStringMatchesRegex", pattern: "", flags: "gm" } });
              break;
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
      />
    </div>
  );
}

export default AnyTestOpTypeSelect;
