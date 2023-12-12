import React from 'react';
import s from './TestOpStringMatchesRegexInput.module.css'
import { TestOpStringMatchesRegex } from '../../../../../../../basic-message-filter-types';
import FormItem from '../../../../../../../../../ui/ConfigurationTable/FormItem/FormItem';
import Input from '../../../../../../../../../ui/Input/Input';
import { cloneDeep } from 'lodash';

const caseInsensitiveAddonId = "7a493c72-9ba6-43e3-9f72-691ed4cd860e";
const multilineAddonId = "a38f403c-b0a1-4491-a5c0-10c9f289accd";

export type TestOpStringMatchesRegexInputProps = {
  value: TestOpStringMatchesRegex,
  onChange: (v: TestOpStringMatchesRegex) => void,
  isReadOnly?: boolean
};

const TestOpStringMatchesRegexInput: React.FC<TestOpStringMatchesRegexInputProps> = (props) => {
  const toggleFlag = (flag: string) => {
    const newValue = cloneDeep(props.value);
    newValue.flags = props.value.flags.includes(flag) ?
      props.value.flags.split('').filter(f => f !== flag).join('') :
      props.value.flags + flag;
    props.onChange(newValue);
  }

  return (
    <div className={s.TestOpStringStartsWithInput}>
      <FormItem>
        <Input
          size='small'
          value={props.value.pattern}
          onChange={(v) => props.onChange({ ...props.value, pattern: v })}
          addons={[
            {
              id: multilineAddonId,
              isEnabled: props.value.flags.includes('m'),
              label: 'm',
              onClick: () => toggleFlag('m'),
              help: "^ and $ match start/end of line"
            },
            {
              id: caseInsensitiveAddonId,
              isEnabled: props.value.flags.includes('i'),
              label: 'i',
              onClick: () => toggleFlag('i'),
              help: "Case insensitive match"
            }
          ]}
          isReadOnly={props.isReadOnly}
        />
      </FormItem>
    </div>
  );
}

export default TestOpStringMatchesRegexInput;
