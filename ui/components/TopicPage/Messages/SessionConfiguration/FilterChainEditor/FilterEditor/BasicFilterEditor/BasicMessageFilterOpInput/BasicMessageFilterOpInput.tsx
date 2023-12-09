import React from 'react';
import s from './BasicMessageFilterOpInput.module.css'
import Toggle from '../../../../../../../ui/Toggle/Toggle';
import { AnyTestOp, BasicMessageFilterBraces, BasicMessageFilterOp } from '../../../../../basic-message-filter-types';
import AnyTestOpInput from './AnyTestOpInput/AnyTestOpInput';
import { cloneDeep } from 'lodash';
import BasicMessageFilterBracesInput from './BasicMessageFilterBracesInput/BasicMessageFilterBracesInput';

export type BasicMessageFilterOpInputProps = {
  value: BasicMessageFilterOp,
  onChange: (v: BasicMessageFilterOp) => void
};

const BasicMessageFilterOpInput: React.FC<BasicMessageFilterOpInputProps> = (props) => {
  return (
    <div className={s.BasicMessageFilterOpInput}>
      <div>
        <Toggle
          value={props.value.isEnabled}
          onChange={(v) => props.onChange({ ...props.value, isEnabled: v })}
          label="Enabled"
        />
        <Toggle
          value={props.value.isNegated}
          onChange={(v) => props.onChange({ ...props.value, isNegated: v })}
          label="Inverted"
        />
      </div>
      <div>
        <Toggle
          value={props.value.op.type === "BasicMessageFilterBraces"}
          onChange={(v) => {
            if (v) {
              const newValue = cloneDeep(props.value);
              const newOp: BasicMessageFilterBraces = {
                type: "BasicMessageFilterBraces",
                mode: "all",
                ops: [props.value]
              };
              newValue.op = newOp;
              props.onChange(newValue);
              return;
            }

            if (props.value.op.type === "BasicMessageFilterBraces") {
              const newValue = cloneDeep(props.value);
              const newOp: AnyTestOp = {
                type: "AnyTestOp",
                op: (props.value.op.ops.length !== 0 && props.value.op.ops[1]?.op.type === "AnyTestOp") ?
                  props.value.op.ops[1].op.op :
                  {
                    type: "TestOpIsDefined"
                  }
              };
              newValue.op = newOp;
              props.onChange(newValue);
              return;
            }
          }}
          label="Braces"
        />
      </div>
      <div>
        {props.value.op.type === "AnyTestOp" && (
          <AnyTestOpInput
            value={props.value.op}
            onChange={(v) => props.onChange({ ...props.value, op: v })}
          />
        )}
        {props.value.op.type === "BasicMessageFilterBraces" && (
          <BasicMessageFilterBracesInput
            value={props.value.op}
            onChange={(v) => props.onChange({ ...props.value, op: v })}
          />
        )}
      </div>
    </div>
  );
}

export default BasicMessageFilterOpInput;
