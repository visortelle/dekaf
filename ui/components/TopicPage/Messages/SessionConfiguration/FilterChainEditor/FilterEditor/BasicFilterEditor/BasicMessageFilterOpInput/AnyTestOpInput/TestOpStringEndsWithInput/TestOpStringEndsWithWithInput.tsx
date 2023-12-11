import React from 'react';
import s from './TestOpStringEndsWithInput.module.css'
import { TestOpStringEndsWith, TestOpStringEquals } from '../../../../../../../basic-message-filter-types';
import StringFilterInput from '../../../../../../../../../ui/Input/StringFilterInput/StringFilterInput';
import FormItem from '../../../../../../../../../ui/ConfigurationTable/FormItem/FormItem';

export type TestOpStringEndsWithInputProps = {
  value: TestOpStringEndsWith,
  onChange: (v: TestOpStringEndsWith) => void
};

const TestOpStringEndsWithInput: React.FC<TestOpStringEndsWithInputProps> = (props) => {
  return (
    <div className={s.TestOpStringEndsWithInput}>
      <FormItem>
        <StringFilterInput
          size='small'
          value={props.value.endsWith}
          onChange={(v) => props.onChange({ ...props.value, endsWith: v })}
          isMatchCase={!props.value.isCaseInsensitive}
          onIsMatchCaseChange={v => props.onChange({ ...props.value, isCaseInsensitive: !v })}
        />
      </FormItem>
    </div>
  );
}

export default TestOpStringEndsWithInput;
