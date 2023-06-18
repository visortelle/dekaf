import React from 'react';
import { SingleOptionFilterValue, SingleOptionFilterDescriptor } from '../types';
import Select from '../../../Select/Select';

export type OptionFilterInputProps = {
  descriptor: SingleOptionFilterDescriptor;
  value: SingleOptionFilterValue;
  onChange: (value: SingleOptionFilterValue) => void;
};

const OptionFilterInput: React.FC<OptionFilterInputProps> = (props) => {
  return (
    <Select<string>
      value={props.value.value}
      onChange={(v) => props.onChange({ ...props.value, value: v })}
      list={props.descriptor.options.map((option) => ({
        type: 'item',
        value: option.value,
        title: option.label,
      }))}
    />
  );
}

export default OptionFilterInput;
