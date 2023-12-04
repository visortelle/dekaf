import React from 'react';
import s from './TestOpArrayAnyInput.module.css'
import { TestOpArrayAny } from '../../../../../../../basic-message-filter-types';
import BasicMessageFilterOpInput from '../../BasicMessageFilterOpInput';

export type TestOpArrayAnyInputProps = {
  value: TestOpArrayAny,
  onChange: (v: TestOpArrayAny) => void
};

const TestOpArrayAnyInput: React.FC<TestOpArrayAnyInputProps> = (props) => {
  return (
    <div className={s.TestOpArrayAnyInput}>
      <BasicMessageFilterOpInput
        value={props.value.testItemOp}
        onChange={(v) => props.onChange({ ...props.value, testItemOp: v })}
      />
    </div>
  );
}

export default TestOpArrayAnyInput;
