import React from 'react';
import s from './AnyTestOpInput.module.css'
import { AnyTestOp, TestOpArrayAll, TestOpArrayAny } from '../../../../../../basic-message-filter-types';
import TestOpStringEqualsInput from './TestOpStringEqualsInput/TestOpStringEqualsInput';
import Select from '../../../../../../../../ui/Select/Select';
import TestOpArrayAllInput from './TestOpArrayAllInput/TestOpArrayAllInput';
import TestOpArrayAnyInput from './TestOpArrayAnyInput/TestOpArrayAnyInput';
import { v4 as uuid } from 'uuid';
import FormItem from '../../../../../../../../ui/ConfigurationTable/FormItem/FormItem';

export type AnyTestOpInputProps = {
  value: AnyTestOp,
  onChange: (v: AnyTestOp) => void
};

const AnyTestOpInput: React.FC<AnyTestOpInputProps> = (props) => {
  return (
    <div className={s.AnyTestOpInput}>
      <FormItem>
        <Select<AnyTestOp['op']['type']>
          list={[
            {
              type: "group", title: "Any JSON type", items: [
                // { type: "item", title: "Always OK", value: "TestOpAlwaysOk" },
                { type: "item", title: "is defined", value: "TestOpIsDefined" },
                { type: "item", title: "is null", value: "TestOpIsNull" },
              ]
            },
            {
              type: "group", title: "Boolean", items: [
                { type: "item", title: "is true or false", value: "TestOpBoolEquals" },
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
              type: "group", title: "Array", items: [
                { type: "item", title: "every items match", value: "TestOpArrayAll" },
                { type: "item", title: "some item matches", value: "TestOpArrayAny" },
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
                      type: "TestOpArrayAny",
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
                      type: "TestOpArrayAll",
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
      </FormItem>

      <div>
        {props.value.op.type === "TestOpStringEquals" && (
          <TestOpStringEqualsInput
            value={props.value.op}
            onChange={(v) => props.onChange({ ...props.value, op: v })}
          />
        )}
        {props.value.op.type === "TestOpArrayAll" && (
          <TestOpArrayAllInput
            value={props.value.op}
            onChange={(v) => props.onChange({ ...props.value, op: v })}
          />
        )}
        {props.value.op.type === "TestOpArrayAny" && (
          <TestOpArrayAnyInput
            value={props.value.op}
            onChange={(v) => props.onChange({ ...props.value, op: v })}
          />
        )}
      </div>
    </div>
  );
}

export default AnyTestOpInput;
