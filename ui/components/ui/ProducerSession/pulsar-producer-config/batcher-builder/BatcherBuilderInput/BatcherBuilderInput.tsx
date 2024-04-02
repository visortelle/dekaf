import React from 'react';
import s from './BatcherBuilderInput.module.css'
import { BatcherBuilder } from '../batcher-builder';
import FormItem from '../../../../ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../../../ConfigurationTable/FormLabel/FormLabel';
import Select from '../../../../Select/Select';
import Toggle from '../../../../Toggle/Toggle';

export type BatcherBuilderInputProps = {
  value: BatcherBuilder | undefined,
  onChange: (v: BatcherBuilder | undefined) => void
};

const BatcherBuilderInput: React.FC<BatcherBuilderInputProps> = (props) => {
  return (
    <div className={s.BatcherBuilderInput}>
      <FormItem size='small'>
        <div>
          <FormLabel content="Batcher Builder" />
          <Toggle
            value={props.value !== undefined}
            onChange={(v) => {
              if (v) {
                props.onChange({
                  type: 'batcher-builder',
                  builder: {
                    type: 'default-batcher-builder'
                  }
                });
              } else {
                props.onChange(undefined);
              }
            }}
          />
        </div>

        {props.value === undefined ? null : (
          <Select<BatcherBuilder['builder']['type']>
            size='small'
            value={props.value.builder.type}
            list={[
              { type: 'item', title: 'Default', value: 'default-batcher-builder' },
              { type: 'item', title: 'Key Based', value: 'key-based-batcher-builder' },
            ]}

            onChange={(v) => {
              if (props.value === undefined) {
                return;
              }

              switch (v) {
                case 'default-batcher-builder':
                  props.onChange({
                    ...props.value,
                    builder: {
                      type: 'default-batcher-builder'
                    }
                  });
                  break;

                case 'key-based-batcher-builder':
                  props.onChange({
                    ...props.value,
                    builder: {
                      type: 'key-based-batcher-builder'
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

export default BatcherBuilderInput;
