import React from 'react';
import s from './BasicMessageFilterBracesInput.module.css'
import { BasicMessageFilterBraces, BasicMessageFilterOp } from '../../../../../../basic-message-filter-types';
import Toggle from '../../../../../../../../ui/Toggle/Toggle';
import ListInput from '../../../../../../../../ui/ConfigurationTable/ListInput/ListInput';
import BasicMessageFilterOpInput from '../BasicMessageFilterOpInput';
import { cloneDeep } from 'lodash';
import { v4 as uuid } from 'uuid';
import IconToggle from '../../../../../../../../ui/IconToggle/IconToggle';

export type BasicMessageFilterBracesInputProps = {
  value: BasicMessageFilterBraces,
  onChange: (v: BasicMessageFilterBraces) => void
};

const BasicMessageFilterBracesInput: React.FC<BasicMessageFilterBracesInputProps> = (props) => {
  return (
    <div className={s.BasicMessageFilterBracesInput}>
      <div style={{ marginLeft: 'auto', display: 'inline-flex', marginBottom: '-18rem', position: 'relative', zIndex: 5 }}>
        <IconToggle<'all' | 'any'>
          items={[
            { type: "item", value: 'all', label: 'AND', help: 'Every test operation should match.' },
            { type: "item", value: 'any', label: 'OR', help: 'Some test operation should match.' }
          ]}
          value={props.value.mode}
          onChange={(v) => props.onChange({
            ...props.value,
            mode: v
          })}
        />
      </div>

      <div>
        <ListInput<BasicMessageFilterOp>
          value={props.value.ops}
          renderItem={(item) => (
            <BasicMessageFilterOpInput
              value={item}
              onChange={(v) => {
                const newValue = cloneDeep(props.value);
                const opIndex = newValue.ops.findIndex(op => op.reactKey === v.reactKey);
                newValue.ops[opIndex] = v;
                props.onChange(newValue);
              }}
            />
          )}
          getId={(v) => v.reactKey}
          isHideNothingToShow
          itemName="Test Operation"
          onAdd={() => {
            const newOp: BasicMessageFilterOp = {
              type: "BasicMessageFilterOp",
              isEnabled: true,
              isNegated: false,
              reactKey: uuid(),
              op: {
                type: "AnyTestOp",
                op: {
                  type: "TestOpIsDefined"
                }
              }
            };
            props.onChange({ ...props.value, ops: [...props.value.ops, newOp] })
          }}
          onRemove={(v) => props.onChange({ ...props.value, ops: props.value.ops.filter(op => op.reactKey !== v) })}
          onChange={(v) => props.onChange({ ...props.value, ops: v })}
        />
      </div>
    </div>
  );
}

export default BasicMessageFilterBracesInput;
