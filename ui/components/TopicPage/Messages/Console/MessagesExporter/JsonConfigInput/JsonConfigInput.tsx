import React from 'react';
import FormItem from '../../../../../ui/ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../../../../ui/ConfigurationTable/FormLabel/FormLabel';
import { JsonConfig } from '../types';
import Select from '../../../../../ui/Select/Select';
import s from './JsonConfigInput.module.css'

export type JsonConfigInputProps = {
  value: JsonConfig,
  onChange: (value: JsonConfig) => void,
};

const JsonConfigInput: React.FC<JsonConfigInputProps> = (props) => {
  return (
    <div className={s.JsonConfigInput}>
      <FormItem>
        <FormLabel content="JSON formatting" />
        <div>
          <Select<JsonConfig['formatting']>
            list={[
              { type: 'item', value: 'minified', title: 'Minified' },
              { type: 'item', value: 'human-readable', title: 'Human readable' }
            ]}
            value={props.value.formatting}
            onChange={(v) => props.onChange({ ...props.value, formatting: v })}
          />
        </div>
      </FormItem>
    </div>
  );
}

export default JsonConfigInput;
