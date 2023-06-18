import React, { ReactNode } from 'react';
import { StringFilterDescriptor, StringFilterValue } from '../types';
import Input from '../../../Input/Input';

export type StringFilterInputProps = {
  descriptor: StringFilterDescriptor;
  value: StringFilterValue;
  onChange: (value: StringFilterValue) => void;
};

const StringFilterInput: React.FC<StringFilterInputProps> = (props) => {
  return <Input value={props.value.value} onChange={(v) => props.onChange({ type: 'string', value: v })} clearable />;
}

export default StringFilterInput;
