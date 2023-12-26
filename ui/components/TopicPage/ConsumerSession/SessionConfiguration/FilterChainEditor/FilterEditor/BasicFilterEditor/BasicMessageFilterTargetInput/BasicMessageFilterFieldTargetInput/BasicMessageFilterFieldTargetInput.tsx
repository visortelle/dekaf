import React from 'react';
import s from './BasicMessageFilterFieldTargetInput.module.css'
import { BasicMessageFilterFieldTarget } from '../../../../../../basic-message-filter-types';
import Input from '../../../../../../../../ui/Input/Input';

export type BasicMessageFilterFieldTargetInputProps = {
  value: BasicMessageFilterFieldTarget,
  onChange: (v: BasicMessageFilterFieldTarget) => void,
  isReadOnly?: boolean
};

const BasicMessageFilterFieldTargetInput: React.FC<BasicMessageFilterFieldTargetInputProps> = (props) => {
  return (
    <div className={s.BasicMessageFilterFieldTargetInput}>
      <Input
        size='small'
        value={props.value.jsonFieldSelector || ''}
        onChange={v => props.onChange({ ...props.value, jsonFieldSelector: v })}
        placeholder='items[42].id'
        isReadOnly={props.isReadOnly}
      />
    </div>
  );
}

export default BasicMessageFilterFieldTargetInput;
