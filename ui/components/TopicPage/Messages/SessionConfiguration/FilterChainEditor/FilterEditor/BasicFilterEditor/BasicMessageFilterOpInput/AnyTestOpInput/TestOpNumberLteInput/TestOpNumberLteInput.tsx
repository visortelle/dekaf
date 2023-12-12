import React from 'react';
import s from './TestOpNumberLteInput.module.css'
import { TestOpNumberLte } from '../../../../../../../basic-message-filter-types';
import FormItem from '../../../../../../../../../ui/ConfigurationTable/FormItem/FormItem';
import Input from '../../../../../../../../../ui/Input/Input';

export type TestOpNumberLteInputProps = {
  value: TestOpNumberLte,
  onChange: (v: TestOpNumberLte) => void
};

const TestOpNumberLteInput: React.FC<TestOpNumberLteInputProps> = (props) => {
  return (
    <div className={s.TestOpNumberLteInput}>
      <FormItem>
        <Input
          size='small'
          value={props.value.lte}
          onChange={(v) => props.onChange({ ...props.value, lte: v })}
          inputProps={{ type: 'number' }}
        />
      </FormItem>
    </div>
  );
}

export default TestOpNumberLteInput;
