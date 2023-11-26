import React from 'react';
import s from './BasicMessageFilterOpInput.module.css'
import Toggle from '../../../../../../../ui/Toggle/Toggle';
import { BasicMessageFilterOp } from '../../../../../basic-message-filter-types';
import AnyTestOpInput from './AnyTestOpInput/AnyTestOpInput';

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
          label="Negated"
        />
      </div>
      <div>
        {props.value.op.type === "AnyTestOp" && (
          <AnyTestOpInput
            value={props.value.op}
            onChange={(v) => props.onChange({ ...props.value, op: v })}
          />
        )}
      </div>
    </div>
  );
}

export default BasicMessageFilterOpInput;
