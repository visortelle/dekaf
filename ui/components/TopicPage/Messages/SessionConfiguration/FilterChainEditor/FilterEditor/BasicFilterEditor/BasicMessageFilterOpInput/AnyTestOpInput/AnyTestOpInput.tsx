import React from 'react';
import s from './AnyTestOpInput.module.css'
import { AnyTestOp } from '../../../../../../basic-message-filter-types';
import TestOpStringEqualsInput from './TestOpStringEqualsInput/TestOpStringEqualsInput';
import Select from '../../../../../../../../ui/Select/Select';

export type AnyTestOpInputProps = {
  value: AnyTestOp,
  onChange: (v: AnyTestOp) => void
};

const AnyTestOpInput: React.FC<AnyTestOpInputProps> = (props) => {
  return (
    <div className={s.AnyTestOpInput}>
      <div>
        <Select<AnyTestOp['op']['type']>
          list={[
            { type: "item", title: "Pass Always", value: "TestOpAlwaysOk" },
            { type: "item", title: "Is Defined", value: "TestOpIsDefined" },
            { type: "item", title: "Is Null", value: "TestOpIsNull" },
            { type: "item", title: "Is True or False", value: "TestOpBoolEquals" },
            {
              type: "group", title: "Strings", items: [
                { type: "item", title: "String Equals", value: "TestOpStringEquals" },
                { type: "item", title: "String Includes", value: "TestOpStringIncludes" },
                { type: "item", title: "String Starts With", value: "TestOpStringStartsWith" },
                { type: "item", title: "String Ends With", value: "TestOpStringEndsWith" },
                { type: "item", title: "String Matches Regex", value: "TestOpStringMatchesRegex" },
              ]
            },
            {
              type: "group", title: "Arrays", items: [
                { type: "item", title: "All Items Match", value: "TestOpArrayAll" },
                { type: "item", title: "Any Item Match", value: "TestOpArrayAny" },
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
              case "TestOpBoolEquals":
                props.onChange({ ...props.value, op: { type: "TestOpBoolEquals", equals: true } });
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
              case "TestOpArrayAll":
                props.onChange({
                  ...props.value,
                  op: {
                    type: "TestOpArrayAll",
                    testItemOp: {
                      type: "BasicMessageFilterOp",
                      isEnabled: true,
                      isNegated: false,
                      op: { type: "AnyTestOp", op: { type: "TestOpIsDefined" } }
                    }
                  }
                });
                break;
              case "TestOpArrayAny":
                props.onChange({
                  ...props.value,
                  op: {
                    type: "TestOpArrayAny",
                    testItemOp: {
                      type: "BasicMessageFilterOp",
                      isEnabled: true,
                      isNegated: false,
                      op: { type: "AnyTestOp", op: { type: "TestOpIsDefined" } }
                    }
                  }
                });
                break;
            }
          }}
        />
      </div>
      <div>
        {props.value.op.type === "TestOpStringEquals" && (
          <TestOpStringEqualsInput
            value={props.value.op}
            onChange={(v) => props.onChange({ ...props.value, op: v })}
          />
        )}
      </div>
    </div>
  );
}

export default AnyTestOpInput;
