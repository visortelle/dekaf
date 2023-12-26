import React from 'react';
import s from './TestOpStringIncludesInput.module.css'
import { TestOpStringEquals, TestOpStringIncludes } from '../../../../../../../basic-message-filter-types';
import StringFilterInput from '../../../../../../../../Input/StringFilterInput/StringFilterInput';
import FormItem from '../../../../../../../../ConfigurationTable/FormItem/FormItem';

export type TestOpStringIncludesInputProps = {
  value: TestOpStringIncludes,
  onChange: (v: TestOpStringIncludes) => void,
  isReadOnly?: boolean
};

const TestOpStringIncludesInput: React.FC<TestOpStringIncludesInputProps> = (props) => {
  return (
    <div className={s.TestOpStringIncludesInput}>
      <FormItem>
        <StringFilterInput
          size='small'
          value={props.value.includes}
          onChange={(v) => props.onChange({ ...props.value, includes: v })}
          isMatchCase={!props.value.isCaseInsensitive}
          onIsMatchCaseChange={v => props.onChange({ ...props.value, isCaseInsensitive: !v })}
          isReadOnly={props.isReadOnly}
        />
      </FormItem>
    </div>
  );
}

export default TestOpStringIncludesInput;
