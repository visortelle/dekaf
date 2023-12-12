import React from 'react';
import s from './TestOpNumberEqInput.module.css'
import { TestOpNumberEq } from '../../../../../../../basic-message-filter-types';
import FormItem from '../../../../../../../../../ui/ConfigurationTable/FormItem/FormItem';
import Input from '../../../../../../../../../ui/Input/Input';

export type TestOpNumberEqInputProps = {
  value: TestOpNumberEq,
  onChange: (v: TestOpNumberEq) => void
};

const TestOpNumberEqInput: React.FC<TestOpNumberEqInputProps> = (props) => {
  return (
    <div className={s.TestOpNumberEqInput}>
      <FormItem>
        <Input
          size='small'
          value={props.value.eq}
          onChange={(v) => props.onChange({ ...props.value, eq: v })}
          inputProps={{ type: 'number' }}
        />
      </FormItem>
    </div>
  );
}

export default TestOpNumberEqInput;
