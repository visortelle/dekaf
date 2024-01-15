import React from 'react';
import s from './BasicMessageFilterBracesInput.module.css'
import { BasicMessageFilterBraces, BasicMessageFilterOp } from '../../../../../../basic-message-filter-types';
import ListInput from '../../../../../../../ConfigurationTable/ListInput/ListInput';
import BasicMessageFilterOpInput from '../BasicMessageFilterOpInput';
import { cloneDeep } from 'lodash';
import { v4 as uuid } from 'uuid';
import IconToggle from '../../../../../../../IconToggle/IconToggle';

export type BasicMessageFilterBracesInputProps = {
  value: BasicMessageFilterBraces,
  onChange: (v: BasicMessageFilterBraces) => void,
  isReadOnly?: boolean
};

const BasicMessageFilterBracesInput: React.FC<BasicMessageFilterBracesInputProps> = (props) => {
  return (
    <div className={s.BasicMessageFilterBracesInput}>
      <div>
        <ListInput<BasicMessageFilterOp>
          value={props.value.ops}
          renderItem={(item, i) => {
            const isLast = i === props.value.ops.length - 1;
            const isBraces = item.op.type === "BasicMessageFilterBraces";
            return (
              <div className={`${s.Item} ${isBraces ? s.BracesItem : ''}`}>
                <BasicMessageFilterOpInput
                  value={item}
                  onChange={(v) => {
                    const newValue = cloneDeep(props.value);
                    const opIndex = newValue.ops.findIndex(op => op.reactKey === v.reactKey);
                    newValue.ops[opIndex] = v;
                    props.onChange(newValue);
                  }}
                  isShowEnableToggle={true}
                  isReadOnly={props.isReadOnly}
                />
                {!isLast && (
                  <div className={s.Mode}>
                    <IconToggle<'all' | 'any'>
                      items={[
                        { type: "item", value: 'all', label: 'AND', help: 'Every comparison operation should match.' },
                        { type: "item", value: 'any', label: 'OR', help: 'Some comparison operation should match.' }
                      ]}
                      value={props.value.mode}
                      onChange={(v) => props.onChange({
                        ...props.value,
                        mode: v
                      })}
                      isReadOnly={props.isReadOnly}
                    />
                  </div>
                )}
              </div>
            );
          }}
          getId={(v) => v.reactKey}
          isHideNothingToShow
          isContentDoesntOverlapRemoveButton
          itemName="Comparison Operation"
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
          isReadOnly={props.isReadOnly}
        />
      </div>
    </div>
  );
}

export default BasicMessageFilterBracesInput;
