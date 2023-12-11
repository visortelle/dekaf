import React from 'react';
import s from './TestOpNumberLtInput.module.css'
import { TestOpNumberLt } from '../../../../../../../basic-message-filter-types';
import FormItem from '../../../../../../../../../ui/ConfigurationTable/FormItem/FormItem';
import Input from '../../../../../../../../../ui/Input/Input';

export type TestOpNumberLtInputProps = {
  value: TestOpNumberLt,
  onChange: (v: TestOpNumberLt) => void
};

const TestOpNumberLtInput: React.FC<TestOpNumberLtInputProps> = (props) => {
  return (
    <div className={s.TestOpNumberLtInput}>
      <FormItem>
        <Input
          size='small'
          value={props.value.lt}
          onChange={(v) => props.onChange({ ...props.value, lt: v })}
        />
      </FormItem>
    </div>
  );
}

export default TestOpNumberLtInput;
