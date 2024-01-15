import React from 'react';
import s from './BasicFilterEditor.module.css'
import { BasicMessageFilter } from '../../../../basic-message-filter-types';
import BasicMessageFilterOpInput from './BasicMessageFilterOpInput/BasicMessageFilterOpInput';
import FormItem from '../../../../../ConfigurationTable/FormItem/FormItem';

export type BasicFilterEditorProps = {
  value: BasicMessageFilter,
  onChange: (v: BasicMessageFilter) => void,
  isReadOnly?: boolean
};

const BasicFilterEditor: React.FC<BasicFilterEditorProps> = (props) => {
  return (
    <div className={s.BasicFilterEditor}>
      <FormItem size='small'>
        <BasicMessageFilterOpInput
          value={props.value.op}
          onChange={(v) => props.onChange({ ...props.value, op: v })}
          isShowEnableToggle={false}
          isReadOnly={props.isReadOnly}
        />
      </FormItem>
    </div>
  );
}

export default BasicFilterEditor;
