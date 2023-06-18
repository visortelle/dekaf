import React from 'react';
import s from './NumberFilterInput.module.css'
import { NumberFilterValue, NumberFilterOperation, NumberFilterDescriptor } from '../types';
import Select from '../../../Select/Select';
import FormItem from '../../../ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../../ConfigurationTable/FormLabel/FormLabel';
import Input from '../../../Input/Input';

export type NumberFilterInputProps = {
  descriptor: NumberFilterDescriptor;
  value: NumberFilterValue;
  onChange: (value: NumberFilterValue) => void;
};

const NumberFilterInput: React.FC<NumberFilterInputProps> = (props) => {
  return (
    <div className={s.NumberFilterInput}>
      <FormItem>
        <FormLabel content="Operation" />
        <div className={s.Input}>
          <Select<NumberFilterOperation>
            value={props.value.op}
            onChange={(v) => props.onChange({ ...props.value, op: v })}
            list={[
              { type: 'item', value: 'eq', title: 'Equals' },
              { type: 'item', value: 'neq', title: 'Not equals' },
              { type: 'item', value: 'gt', title: 'Greater than' },
              { type: 'item', value: 'gte', title: 'Greater than or equals' },
              { type: 'item', value: 'lt', title: 'Less than' },
              { type: 'item', value: 'lte', title: 'Less than or equals' },
            ]}
          />
        </div>
      </FormItem>

      <FormItem>
        <FormLabel content="Value" />
        <div className={s.Input}>
          <Input
            value={props.value.value.toString()}
            onChange={(v) => props.onChange({ ...props.value, value: Number(v) })}
            inputProps={{ type: 'number' }}
          />
        </div>
      </FormItem>
    </div>
  );
}

export default NumberFilterInput;
