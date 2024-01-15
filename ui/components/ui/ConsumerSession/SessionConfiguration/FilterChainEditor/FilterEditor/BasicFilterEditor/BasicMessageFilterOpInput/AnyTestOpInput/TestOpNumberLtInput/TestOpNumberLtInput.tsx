import React from 'react';
import s from './TestOpNumberLtInput.module.css'
import { TestOpNumberLt } from '../../../../../../../basic-message-filter-types';
import FormItem from '../../../../../../../../ConfigurationTable/FormItem/FormItem';
import Input from '../../../../../../../../Input/Input';

export type TestOpNumberLtInputProps = {
  value: TestOpNumberLt,
  onChange: (v: TestOpNumberLt) => void,
  isReadOnly?: boolean
};

const TestOpNumberLtInput: React.FC<TestOpNumberLtInputProps> = (props) => {
  return (
    <div className={s.TestOpNumberLtInput}>
      <FormItem>
        <Input
          size='small'
          value={props.value.lt}
          onChange={(v) => props.onChange({ ...props.value, lt: v })}
          inputProps={{ type: 'number' }}
          isReadOnly={props.isReadOnly}
        />
      </FormItem>
    </div>
  );
}

export default TestOpNumberLtInput;
