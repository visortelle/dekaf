import React from 'react';
import s from './BasicFilterEditor.module.css'
import { BasicMessageFilter } from '../../../../basic-message-filter-types';
import BasicMessageFilterTargetInput from './BasicMessageFilterTargetInput/BasicMessageFilterTargetInput';
import BasicMessageFilterOpInput from './BasicMessageFilterOpInput/BasicMessageFilterOpInput';

export type BasicFilterEditorProps = {
  value: BasicMessageFilter,
  onChange: (v: BasicMessageFilter) => void
};

const BasicFilterEditor: React.FC<BasicFilterEditorProps> = (props) => {
  return (
    <div className={s.BasicFilterEditor}>
      <div>
        <BasicMessageFilterTargetInput
          value={props.value.target}
          onChange={(v) => props.onChange({ ...props.value, target: v })}
        />
      </div>
      <div>
        <BasicMessageFilterOpInput
          value={props.value.op}
          onChange={(v) => props.onChange({ ...props.value, op: v })}
        />
      </div>
    </div>
  );
}

export default BasicFilterEditor;
