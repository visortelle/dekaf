import React from 'react';
import s from './TestOpStringStartsWithInput.module.css'
import { TestOpStringStartsWith } from '../../../../../../../basic-message-filter-types';
import StringFilterInput from '../../../../../../../../../ui/Input/StringFilterInput/StringFilterInput';
import FormItem from '../../../../../../../../../ui/ConfigurationTable/FormItem/FormItem';

export type TestOpStringStartsWithInputProps = {
  value: TestOpStringStartsWith,
  onChange: (v: TestOpStringStartsWith) => void
};

const TestOpStringStartsWithInput: React.FC<TestOpStringStartsWithInputProps> = (props) => {
  return (
    <div className={s.TestOpStringStartsWithInput}>
      <FormItem>
        <StringFilterInput
          size='small'
          value={props.value.startsWith}
          onChange={(v) => props.onChange({ ...props.value, startsWith: v })}
          isMatchCase={!props.value.isCaseInsensitive}
          onIsMatchCaseChange={v => props.onChange({ ...props.value, isCaseInsensitive: !v })}
        />
      </FormItem>
    </div>
  );
}

export default TestOpStringStartsWithInput;
