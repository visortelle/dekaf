import React from 'react';
import s from './TestOpArrayAllInput.module.css'
import { TestOpArrayAll } from '../../../../../../../basic-message-filter-types';
import BasicMessageFilterOpInput from '../../BasicMessageFilterOpInput';

export type TestOpArrayAllInputProps = {
  value: TestOpArrayAll,
  onChange: (v: TestOpArrayAll) => void
};

const TestOpArrayAllInput: React.FC<TestOpArrayAllInputProps> = (props) => {
  return (
    <div className={s.TestOpArrayAllInput}>
      <BasicMessageFilterOpInput
        value={props.value.testItemOp}
        onChange={(v) => props.onChange({ ...props.value, testItemOp: v })}
      />
    </div>
  );
}

export default TestOpArrayAllInput;
