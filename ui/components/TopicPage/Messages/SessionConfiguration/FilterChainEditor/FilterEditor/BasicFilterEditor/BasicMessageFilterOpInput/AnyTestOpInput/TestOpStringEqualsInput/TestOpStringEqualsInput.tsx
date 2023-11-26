import React from 'react';
import s from './TestOpStringEqualsInput.module.css'
import { TestOpStringEquals } from '../../../../../../../basic-message-filter-types';
import Toggle from '../../../../../../../../../ui/Toggle/Toggle';
import Input from '../../../../../../../../../ui/Input/Input';

export type TestOpStringEqualsInputProps = {
  value: TestOpStringEquals,
  onChange: (v: TestOpStringEquals) => void
};

const TestOpStringEqualsInput: React.FC<TestOpStringEqualsInputProps> = (props) => {
  return (
    <div className={s.TestOpStringEqualsInput}>
      <Input
        value={props.value.equals}
        onChange={(v) => props.onChange({ ...props.value, equals: v })}
      />
      <Toggle
        value={props.value.isCaseInsensitive}
        onChange={(v) => props.onChange({ ...props.value, isCaseInsensitive: v })}
        label="Ignore Case"
      />
    </div>
  );
}

export default TestOpStringEqualsInput;
