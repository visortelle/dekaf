import React from 'react';
import s from './ProducerNameInput.module.css'
import Input from '../../../../../Input/Input';
import FormItem from '../../../../../ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../../../../ConfigurationTable/FormLabel/FormLabel';
import Toggle from '../../../../../Toggle/Toggle';

export type ProducerNameInputProps = {
  value: string | undefined,
  onChange: (v: string | undefined) => void
};

const ProducerNameInput: React.FC<ProducerNameInputProps> = (props) => {
  return (
    <div className={s.ProducerNameInput}>
      <FormItem size='small'>
        <div>
          <FormLabel content="Producer Name" />
          <Toggle
            value={props.value !== undefined}
            onChange={(v) => props.onChange(v ? '' : undefined)}
          />
        </div>
      </FormItem>

      {props.value === undefined ? null : (
        <Input
          size='small'
          value={props.value}
          onChange={(v) => props.onChange(v)}
        />
      )}
    </div>
  );
}

export default ProducerNameInput;
