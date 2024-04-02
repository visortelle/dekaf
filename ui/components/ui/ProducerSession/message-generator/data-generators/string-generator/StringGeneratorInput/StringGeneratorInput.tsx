import React from 'react';
import s from './StringGeneratorInput.module.css'
import { StringGenerator } from '../string-generator';
import FormItem from '../../../../../ConfigurationTable/FormItem/FormItem';
import Select from '../../../../../Select/Select';
import FixedStringGeneratorInput from '../FixedStringGeneratorInput/FixedStringGeneratorInput';
import JsonGeneratorInput from '../../json-generator/JsonGeneratorInput/JsonGeneratorInput';

export type StringGeneratorInputProps = {
  value: StringGenerator,
  onChange: (v: StringGenerator) => void
};

const StringGeneratorInput: React.FC<StringGeneratorInputProps> = (props) => {
  return (
    <div className={s.StringGeneratorInput}>
      <FormItem size='small'>
        <Select<StringGenerator['generator']['type']>
          size='small'
          value={props.value.generator.type}
          list={[
            { type: 'item', title: 'Fixed', value: 'fixed-string-generator' },
            { type: 'item', title: 'From JSON', value: 'json-generator' }
          ]}
          onChange={(v) => {
            switch (v) {
              case 'fixed-string-generator':
                props.onChange({
                  ...props.value,
                  generator: {
                    type: 'fixed-string-generator',
                    string: '',
                  }
                });
                break;
              case 'json-generator':
                props.onChange({
                  ...props.value,
                  generator: {
                    type: 'json-generator',
                    generator: {
                      type: 'fixed-json-generator',
                      json: '""'
                    },
                  }
                });
                break;
            }
          }}
        />
      </FormItem>

      <FormItem>
        {props.value.generator.type === 'fixed-string-generator' && (
          <FixedStringGeneratorInput
            value={props.value.generator}
            onChange={(v) => props.onChange({ ...props.value, generator: v })}
          />
        )}
        {props.value.generator.type === 'json-generator' && (
          <JsonGeneratorInput
            value={props.value.generator}
            onChange={(v) => props.onChange({ ...props.value, generator: v })}
          />
        )}
      </FormItem>
    </div>
  );
}

export default StringGeneratorInput;
