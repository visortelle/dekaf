import React from 'react';
import s from './BasicMessageFilterOpInput.module.css'
import { AnyTestOp, BasicMessageFilterBraces, BasicMessageFilterOp } from '../../../../../basic-message-filter-types';
import AnyTestOpInput from './AnyTestOpInput/AnyTestOpInput';
import { cloneDeep } from 'lodash';
import BasicMessageFilterBracesInput from './BasicMessageFilterBracesInput/BasicMessageFilterBracesInput';
import OnOffToggle from '../../../../../../IconToggle/OnOffToggle/OnOffToggle';
import InvertedToggle from '../../../../../../IconToggle/InvertedToggle/InvertedToggle';
import IconToggle from '../../../../../../IconToggle/IconToggle';
import bracesIcon from './braces.svg';
import AnyTestOpTypeSelect from './AnyTestOpTypeSelect/AnyTestOpTypeSelect';

export type BasicMessageFilterOpInputProps = {
  value: BasicMessageFilterOp,
  onChange: (v: BasicMessageFilterOp) => void,
  isShowEnableToggle: boolean,
  isReadOnly?: boolean
};

const BasicMessageFilterOpInput: React.FC<BasicMessageFilterOpInputProps> = (props) => {
  const bracesHelp = (
    <>
      Toggle between a single test operation and a nested test operation group. Nested groups enable the coverage of complex filtering cases with many conditions.
      <br />
      <br />
      This approach simplifies the creation of complex filters for less technical users.
      Despite this, we highly recommend using JavaScript filters for complex cases where more than two levels of nesting may be needed.
      Otherwise, it may quickly become cumbersome and hard to understand.
    </>
  );
  return (
    <div className={s.BasicMessageFilterOpInput}>
      <div style={{ display: 'flex', gap: '12rem', marginBottom: '8rem' }}>
        <div style={{ display: 'flex', gap: '6rem', flex: '1 1', alignItems: 'center' }}>
          {props.isShowEnableToggle && (
            <OnOffToggle
              value={props.value.isEnabled}
              onChange={(v) => props.onChange({ ...props.value, isEnabled: v })}
              isReadOnly={props.isReadOnly}
            />
          )}
          <InvertedToggle
            value={props.value.isNegated}
            onChange={(v) => props.onChange({ ...props.value, isNegated: v })}
            helpOverride="Invert result. If enabled, then messages that matches the filter will be not passed and vice versa."
            isReadOnly={props.isReadOnly}
          />
          <IconToggle<boolean>
            items={[
              { type: "item", value: true, iconSvg: bracesIcon, foregroundColor: '#fff', backgroundColor: 'var(--accent-color-yellow)', help: bracesHelp },
              { type: "item", value: false, iconSvg: bracesIcon, foregroundColor: '#fff', backgroundColor: '#aaa', help: bracesHelp }
            ]}
            value={props.value.op.type === "BasicMessageFilterBraces"}
            onChange={(v) => {
              if (v) {
                const newValue = cloneDeep(props.value);
                const newOp: BasicMessageFilterBraces = {
                  type: "BasicMessageFilterBraces",
                  mode: "all",
                  ops: [props.value]
                };
                newValue.op = newOp;
                props.onChange(newValue);
                return;
              }

              if (props.value.op.type === "BasicMessageFilterBraces") {
                const newValue = cloneDeep(props.value);
                const newOp: AnyTestOp = {
                  type: "AnyTestOp",
                  op: (props.value.op.ops.length !== 0 && props.value.op.ops[1]?.op.type === "AnyTestOp") ?
                    props.value.op.ops[1].op.op :
                    {
                      type: "TestOpIsDefined"
                    }
                };
                newValue.op = newOp;
                props.onChange(newValue);
                return;
              }
            }}
            isReadOnly={props.isReadOnly}
          />
          {props.value.op.type === "AnyTestOp" && (
            <div style={{ display: 'flex', flex: '1' }}>
              <AnyTestOpTypeSelect
                value={props.value.op}
                onChange={(v) => props.onChange({ ...props.value, op: v })}
                isReadOnly={props.isReadOnly}
              />
            </div>
          )}
        </div>
      </div>

      <div>
        {props.value.op.type === "AnyTestOp" && (
          <AnyTestOpInput
            value={props.value.op}
            onChange={(v) => props.onChange({ ...props.value, op: v })}
            isReadOnly={props.isReadOnly}
          />
        )}
        {props.value.op.type === "BasicMessageFilterBraces" && (
          <BasicMessageFilterBracesInput
            value={props.value.op}
            onChange={(v) => props.onChange({ ...props.value, op: v })}
            isReadOnly={props.isReadOnly}
          />
        )}
      </div>
    </div>
  );
}

export default BasicMessageFilterOpInput;
