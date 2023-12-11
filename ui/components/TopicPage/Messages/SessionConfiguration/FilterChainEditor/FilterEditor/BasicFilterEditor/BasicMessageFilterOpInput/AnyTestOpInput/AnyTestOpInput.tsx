import React from 'react';
import s from './AnyTestOpInput.module.css'
import { AnyTestOp } from '../../../../../../basic-message-filter-types';
import TestOpStringEqualsInput from './TestOpStringEqualsInput/TestOpStringEqualsInput';
import TestOpArrayAllInput from './TestOpArrayAllInput/TestOpArrayAllInput';
import TestOpArrayAnyInput from './TestOpArrayAnyInput/TestOpArrayAnyInput';
import TestOpStringMatchesRegexInput from './TestOpStringMatchesRegexInput/TestOpStringMatchesRegexInput';
import TestOpStringIncludesInput from './TestOpStringIncludesInput/TestOpStringIncludesInput';
import TestOpStringStartsWithInput from './TestOpStringStartsWith/TestOpStringStartsWithInput';
import TestOpStringEndsWithInput from './TestOpStringEndsWithInput/TestOpStringEndsWithWithInput';

export type AnyTestOpInputProps = {
  value: AnyTestOp,
  onChange: (v: AnyTestOp) => void
};

const AnyTestOpInput: React.FC<AnyTestOpInputProps> = (props) => {
  return (
    <div className={s.AnyTestOpInput}>
      {props.value.op.type === "TestOpStringEquals" && (
        <TestOpStringEqualsInput
          value={props.value.op}
          onChange={(v) => props.onChange({ ...props.value, op: v })}
        />
      )}
      {props.value.op.type === "TestOpStringIncludes" && (
        <TestOpStringIncludesInput
          value={props.value.op}
          onChange={(v) => props.onChange({ ...props.value, op: v })}
        />
      )}
      {props.value.op.type === "TestOpStringStartsWith" && (
        <TestOpStringStartsWithInput
          value={props.value.op}
          onChange={(v) => props.onChange({ ...props.value, op: v })}
        />
      )}
      {props.value.op.type === "TestOpStringEndsWith" && (
        <TestOpStringEndsWithInput
          value={props.value.op}
          onChange={(v) => props.onChange({ ...props.value, op: v })}
        />
      )}
      {props.value.op.type === "TestOpStringMatchesRegex" && (
        <TestOpStringMatchesRegexInput
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
  );
}

export default AnyTestOpInput;
