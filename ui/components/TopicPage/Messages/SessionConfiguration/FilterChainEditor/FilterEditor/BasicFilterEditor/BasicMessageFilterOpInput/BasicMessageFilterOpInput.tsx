import React from 'react';
import s from './BasicMessageFilterOpInput.module.css'
import { AnyTestOp, BasicMessageFilterBraces, BasicMessageFilterOp } from '../../../../../basic-message-filter-types';
import AnyTestOpInput from './AnyTestOpInput/AnyTestOpInput';
import { cloneDeep } from 'lodash';
import BasicMessageFilterBracesInput from './BasicMessageFilterBracesInput/BasicMessageFilterBracesInput';
import OnOffToggle from '../../../../../../../ui/IconToggle/OnOffToggle/OnOffToggle';
import InvertedToggle from '../../../../../../../ui/IconToggle/InvertedToggle/InvertedToggle';
import IconToggle from '../../../../../../../ui/IconToggle/IconToggle';
import bracesIcon from './braces.svg';

export type BasicMessageFilterOpInputProps = {
  value: BasicMessageFilterOp,
  onChange: (v: BasicMessageFilterOp) => void
};

const BasicMessageFilterOpInput: React.FC<BasicMessageFilterOpInputProps> = (props) => {
  return (
    <div className={s.BasicMessageFilterOpInput}>
      <div style={{ display: 'flex', gap: '12rem' }}>
        <div style={{ display: 'flex', gap: '6rem', flex: '0 1', alignItems: 'flex-start' }}>
          <OnOffToggle
            value={props.value.isEnabled}
            onChange={(v) => props.onChange({ ...props.value, isEnabled: v })}
          />
          <InvertedToggle
            value={props.value.isNegated}
            onChange={(v) => props.onChange({ ...props.value, isNegated: v })}
            helpOverride="If enabled, then messages that matches the filter will be not passed and vice versa."
          />
          <IconToggle<boolean>
            items={[
              { type: "item", value: true, iconSvg: bracesIcon, foregroundColor: '#fff', backgroundColor: 'var(--accent-color-blue)' },
              { type: "item", value: false, iconSvg: bracesIcon, foregroundColor: '#fff', backgroundColor: '#aaa' }
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
          />
        </div>
        {props.value.op.type === "AnyTestOp" && (
          <div style={{ flex: 1 }}>
            <AnyTestOpInput
              value={props.value.op}
              onChange={(v) => props.onChange({ ...props.value, op: v })}
            />
          </div>
        )}
      </div>
      <div>
        {props.value.op.type === "BasicMessageFilterBraces" && (
          <BasicMessageFilterBracesInput
            value={props.value.op}
            onChange={(v) => props.onChange({ ...props.value, op: v })}
          />
        )}
      </div>
    </div>
  );
}

export default BasicMessageFilterOpInput;
