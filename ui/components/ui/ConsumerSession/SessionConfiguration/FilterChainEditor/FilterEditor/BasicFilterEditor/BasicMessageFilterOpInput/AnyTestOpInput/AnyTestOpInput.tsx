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
import TestOpNumberEqInput from './TestOpNumberEqInput/TestOpNumberEqInput';
import TestOpNumberLtInput from './TestOpNumberLtInput/TestOpNumberLtInput';
import TestOpNumberLteInput from './TestOpNumberLteInput/TestOpNumberLteInput';
import TestOpNumberGtInput from './TestOpNumberGtInput/TestOpNumberGtInput';
import TestOpNumberGteInput from './TestOpNumberGteInput/TestOpNumberGteInput';
import TestOpMatchesJsonInput from "./TestOpMatchesJsonInput/TestOpMatchesJsonInput";
import TestOpContainsJsonInput from "./TestOpContainsJsonInput/TestOpContainsJsonInput";

export type AnyTestOpInputProps = {
  value: AnyTestOp,
  onChange: (v: AnyTestOp) => void,
  isReadOnly?: boolean
};

const AnyTestOpInput: React.FC<AnyTestOpInputProps> = (props) => {
  return (
    <div className={s.AnyTestOpInput}>
      {props.value.op.type === "TestOpNumberEq" && (
        <TestOpNumberEqInput
          value={props.value.op}
          onChange={(v) => props.onChange({ ...props.value, op: v })}
          isReadOnly={props.isReadOnly}
        />
      )}
      {props.value.op.type === "TestOpNumberLt" && (
        <TestOpNumberLtInput
          value={props.value.op}
          onChange={(v) => props.onChange({ ...props.value, op: v })}
          isReadOnly={props.isReadOnly}
        />
      )}
      {props.value.op.type === "TestOpNumberLte" && (
        <TestOpNumberLteInput
          value={props.value.op}
          onChange={(v) => props.onChange({ ...props.value, op: v })}
          isReadOnly={props.isReadOnly}
        />
      )}
      {props.value.op.type === "TestOpNumberGt" && (
        <TestOpNumberGtInput
          value={props.value.op}
          onChange={(v) => props.onChange({ ...props.value, op: v })}
          isReadOnly={props.isReadOnly}
        />
      )}
      {props.value.op.type === "TestOpNumberGte" && (
        <TestOpNumberGteInput
          value={props.value.op}
          onChange={(v) => props.onChange({ ...props.value, op: v })}
          isReadOnly={props.isReadOnly}
        />
      )}

      {props.value.op.type === "TestOpStringEquals" && (
        <TestOpStringEqualsInput
          value={props.value.op}
          onChange={(v) => props.onChange({ ...props.value, op: v })}
          isReadOnly={props.isReadOnly}
        />
      )}
      {props.value.op.type === "TestOpStringIncludes" && (
        <TestOpStringIncludesInput
          value={props.value.op}
          onChange={(v) => props.onChange({ ...props.value, op: v })}
          isReadOnly={props.isReadOnly}
        />
      )}
      {props.value.op.type === "TestOpStringStartsWith" && (
        <TestOpStringStartsWithInput
          value={props.value.op}
          onChange={(v) => props.onChange({ ...props.value, op: v })}
          isReadOnly={props.isReadOnly}
        />
      )}
      {props.value.op.type === "TestOpStringEndsWith" && (
        <TestOpStringEndsWithInput
          value={props.value.op}
          onChange={(v) => props.onChange({ ...props.value, op: v })}
          isReadOnly={props.isReadOnly}
        />
      )}
      {props.value.op.type === "TestOpStringMatchesRegex" && (
        <TestOpStringMatchesRegexInput
          value={props.value.op}
          onChange={(v) => props.onChange({ ...props.value, op: v })}
          isReadOnly={props.isReadOnly}
        />
      )}
      {props.value.op.type === "TestOpMatchesJson" && (
        <TestOpMatchesJsonInput
          value={props.value.op}
          onChange={(v) => props.onChange({ ...props.value, op: v })}
        />
      )}
      {props.value.op.type === "TestOpContainsJson" && (
        <TestOpContainsJsonInput
          value={props.value.op}
          onChange={(v) => props.onChange({ ...props.value, op: v })}
        />
      )}
      {props.value.op.type === "TestOpArrayAll" && (
        <TestOpArrayAllInput
          value={props.value.op}
          onChange={(v) => props.onChange({ ...props.value, op: v })}
          isReadOnly={props.isReadOnly}
        />
      )}
      {props.value.op.type === "TestOpArrayAny" && (
        <TestOpArrayAnyInput
          value={props.value.op}
          onChange={(v) => props.onChange({ ...props.value, op: v })}
          isReadOnly={props.isReadOnly}
        />
      )}
    </div>
  );
}

export default AnyTestOpInput;
