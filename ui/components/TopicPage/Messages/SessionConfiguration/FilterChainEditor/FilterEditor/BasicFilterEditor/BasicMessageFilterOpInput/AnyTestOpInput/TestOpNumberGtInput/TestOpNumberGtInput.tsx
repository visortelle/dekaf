import React from 'react';
import s from './TestOpNumberGtInput.module.css'
import { TestOpNumberGt } from '../../../../../../../basic-message-filter-types';
import FormItem from '../../../../../../../../../ui/ConfigurationTable/FormItem/FormItem';
import Input from '../../../../../../../../../ui/Input/Input';

export type TestOpNumberGtInputProps = {
  value: TestOpNumberGt,
  onChange: (v: TestOpNumberGt) => void
};

const TestOpNumberGtInput: React.FC<TestOpNumberGtInputProps> = (props) => {
  return (
    <div className={s.TestOpNumberGtInput}>
      <FormItem>
        <Input
          size='small'
          value={props.value.gt}
          onChange={(v) => props.onChange({ ...props.value, gt: v })}
        />
      </FormItem>
    </div>
  );
}

export default TestOpNumberGtInput;
