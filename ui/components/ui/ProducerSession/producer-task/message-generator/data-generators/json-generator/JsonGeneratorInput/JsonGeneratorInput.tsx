import React from 'react';
import s from './JsonGeneratorInput.module.css'
import { JsonGenerator } from '../json-generator';
import Select from '../../../../../../Select/Select';
import FormItem from '../../../../../../ConfigurationTable/FormItem/FormItem';
import FixedJsonGeneratorInput from '../FixedJsonGeneratorInput/FixedJsonGeneratorInput';
import JsJsonGeneratorInput from '../JsJsonGeneratorInput/JsJsonGeneratorInput';

export type JsonGeneratorInputProps = {
  value: JsonGenerator,
  onChange: (v: JsonGenerator) => void
};

const JsonGeneratorInput: React.FC<JsonGeneratorInputProps> = (props) => {
  return (
    <div className={s.JsonGeneratorInput}>
      <FormItem size='small'>
        <Select<JsonGenerator['generator']['type']>
          size='small'
          list={[
            { type: 'item', title: 'Fixed', value: 'fixed-json-generator' },
            { type: 'item', title: 'JavaScript', value: 'js-json-generator' },
          ]}
          value={props.value.generator.type}
          onChange={(v) => {
            switch (v) {
              case 'fixed-json-generator':
                props.onChange({
                  ...props.value,
                  generator: {
                    type: 'fixed-json-generator',
                    json: '',
                  }
                });
                break;
              case 'js-json-generator':
                props.onChange({
                  ...props.value,
                  generator: {
                    type: 'js-json-generator',
                    jsCode: `() => {
// You can generate random data by using Faker.js, e.g. libs.faker.person.firstName()
// Available functions: https://fakerjs.dev/api/
  return {};
}`,
                  }
                });
                break;
            }
          }}
        />
      </FormItem>

      <FormItem size='small'>
        {props.value.generator.type === 'fixed-json-generator' && (
          <FixedJsonGeneratorInput
            value={props.value.generator}
            onChange={(v) => props.onChange({ ...props.value, generator: v })}
          />
        )}
        {props.value.generator.type === 'js-json-generator' && (
          <JsJsonGeneratorInput
            value={props.value.generator}
            onChange={(v) => props.onChange({ ...props.value, generator: v })}
          />
        )}
      </FormItem>
    </div>
  );
}

export default JsonGeneratorInput;
