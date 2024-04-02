import React from 'react';
import s from './ValueGeneratorInput.module.css'
import { ValueGenerator } from '../value-generator';
import FormItem from '../../../../ConfigurationTable/FormItem/FormItem';
import Select from '../../../../Select/Select';
import FormLabel from '../../../../ConfigurationTable/FormLabel/FormLabel';
import Toggle from '../../../../Toggle/Toggle';

export type ValueGeneratorInputProps = {
  value: ValueGenerator | undefined,
  onChange: (v: ValueGenerator | undefined) => void
};

const ValueGeneratorInput: React.FC<ValueGeneratorInputProps> = (props) => {
  return (
    <div className={s.ValueGeneratorInput}>
      <FormItem size='small'>
        <div>
          <FormLabel content="Value" />
          <Toggle
            value={props.value !== undefined}
            onChange={(v) => {
              if (!v) {
                props.onChange(undefined);
                return;
              }

              props.onChange({
                type: 'value-generator',
                generator: {
                  type: 'from-json',
                  generator: {
                    type: 'json-generator',
                    generator: {
                      type: 'fixed-json-generator',
                      json: '{}'
                    }
                  }
                }
              });
            }}
          />
        </div>

        {props.value === undefined ? null : (
          <Select<ValueGenerator['generator']['type']>
            size='small'
            value={props.value.generator.type}
            list={[
              { type: 'item', title: 'From Bytes', value: 'from-bytes' },
              { type: 'item', title: 'From JSON', value: 'from-json' },
              { type: 'item', title: 'Use Topic Schema', value: 'value-from-topic-schema' }
            ]}
            onChange={(v) => {
              if (props.value === undefined) {
                return;
              }

              switch (v) {
                case 'from-bytes':
                  props.onChange({
                    ...props.value,
                    generator: {
                      type: 'from-bytes',
                      generator: {
                        type: 'bytes-generator',
                        generator: {
                          type: 'random-bytes-generator',
                          minBytes: 0,
                          maxBytes: 1024
                        }
                      }
                    }
                  });
                  break;

                case 'from-json':
                  props.onChange({
                    ...props.value,
                    generator: {
                      type: 'from-json',
                      generator: {
                        type: 'json-generator',
                        generator: {
                          type: 'fixed-json-generator',
                          json: '{}'
                        }
                      }
                    }
                  });
                  break;

                case 'value-from-topic-schema':
                  props.onChange({
                    ...props.value,
                    generator: {
                      type: 'value-from-topic-schema',
                      generator: {
                        type: 'value-from-topic-schema'
                      }
                    }
                  });
                  break;
              }
            }}
          />
        )}

      </FormItem>
    </div>
  );
}

export default ValueGeneratorInput;
