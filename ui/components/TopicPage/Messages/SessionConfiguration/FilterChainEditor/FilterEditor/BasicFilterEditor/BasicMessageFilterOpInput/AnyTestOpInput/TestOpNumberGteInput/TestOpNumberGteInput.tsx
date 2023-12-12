import React from 'react';
import s from './TestOpNumberGteInput.module.css'
import { TestOpNumberGte } from '../../../../../../../basic-message-filter-types';
import FormItem from '../../../../../../../../../ui/ConfigurationTable/FormItem/FormItem';
import Input from '../../../../../../../../../ui/Input/Input';

export type TestOpNumberGteInputProps = {
  value: TestOpNumberGte,
  onChange: (v: TestOpNumberGte) => void
};

const TestOpNumberGteInput: React.FC<TestOpNumberGteInputProps> = (props) => {
  return (
    <div className={s.TestOpNumberGteInput}>
      <FormItem>
        <Input
          size='small'
          value={props.value.gte}
          onChange={(v) => props.onChange({ ...props.value, gte: v })}
          inputProps={{ type: 'number' }}
        />
      </FormItem>
    </div>
  );
}

export default TestOpNumberGteInput;
