import React from 'react';
import s from './TestOpNumberGteInput.module.css'
import { TestOpNumberGte } from '../../../../../../../basic-message-filter-types';
import FormItem from '../../../../../../../../ConfigurationTable/FormItem/FormItem';
import Input from '../../../../../../../../Input/Input';

export type TestOpNumberGteInputProps = {
  value: TestOpNumberGte,
  onChange: (v: TestOpNumberGte) => void,
  isReadOnly?: boolean
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
          isReadOnly={props.isReadOnly}
        />
      </FormItem>
    </div>
  );
}

export default TestOpNumberGteInput;
