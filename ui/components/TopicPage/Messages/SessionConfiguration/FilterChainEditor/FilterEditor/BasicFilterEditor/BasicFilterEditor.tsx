import React from 'react';
import s from './BasicFilterEditor.module.css'
import { BasicMessageFilter } from '../../../../basic-message-filter-types';
import BasicMessageFilterTargetInput from './BasicMessageFilterTargetInput/BasicMessageFilterTargetInput';
import BasicMessageFilterOpInput from './BasicMessageFilterOpInput/BasicMessageFilterOpInput';
import FormItem from '../../../../../../ui/ConfigurationTable/FormItem/FormItem';
import FormLabel from '../../../../../../ui/ConfigurationTable/FormLabel/FormLabel';

export type BasicFilterEditorProps = {
  value: BasicMessageFilter,
  onChange: (v: BasicMessageFilter) => void
};

const BasicFilterEditor: React.FC<BasicFilterEditorProps> = (props) => {
  return (
    <div className={s.BasicFilterEditor}>
      <FormItem>
        <FormLabel content="Target" size='small' />
        <BasicMessageFilterTargetInput
          value={props.value.target}
          onChange={(v) => props.onChange({ ...props.value, target: v })}
        />
      </FormItem>
      <FormItem>
        <FormLabel content="Test Operation" size='small' />
        <BasicMessageFilterOpInput
          value={props.value.op}
          onChange={(v) => props.onChange({ ...props.value, op: v })}
        />
      </FormItem>
    </div>
  );
}

export default BasicFilterEditor;
