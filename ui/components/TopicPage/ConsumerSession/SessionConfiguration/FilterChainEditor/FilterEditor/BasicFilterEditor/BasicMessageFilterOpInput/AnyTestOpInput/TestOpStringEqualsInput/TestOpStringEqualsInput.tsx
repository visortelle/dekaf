import React from 'react';
import s from './TestOpStringEqualsInput.module.css'
import { TestOpStringEquals } from '../../../../../../../basic-message-filter-types';
import StringFilterInput from '../../../../../../../../../ui/Input/StringFilterInput/StringFilterInput';
import FormItem from '../../../../../../../../../ui/ConfigurationTable/FormItem/FormItem';

export type TestOpStringEqualsInputProps = {
  value: TestOpStringEquals,
  onChange: (v: TestOpStringEquals) => void,
  isReadOnly?: boolean
};

const TestOpStringEqualsInput: React.FC<TestOpStringEqualsInputProps> = (props) => {
  return (
    <div className={s.TestOpStringEqualsInput}>
      <FormItem>
        <StringFilterInput
          size='small'
          value={props.value.equals}
          onChange={(v) => props.onChange({ ...props.value, equals: v })}
          isMatchCase={!props.value.isCaseInsensitive}
          onIsMatchCaseChange={v => props.onChange({ ...props.value, isCaseInsensitive: !v })}
          isReadOnly={props.isReadOnly}
        />
      </FormItem>
    </div>
  );
}

export default TestOpStringEqualsInput;
