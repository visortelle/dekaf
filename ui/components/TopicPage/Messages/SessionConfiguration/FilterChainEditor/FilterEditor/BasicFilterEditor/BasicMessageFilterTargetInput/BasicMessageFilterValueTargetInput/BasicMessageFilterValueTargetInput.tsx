import React from 'react';
import s from './BasicMessageFilterValueTargetInput.module.css'
import { BasicMessageFilterValueTarget } from '../../../../../../basic-message-filter-types';
import Input from '../../../../../../../../ui/Input/Input';

export type BasicMessageFilterValueTargetInputProps = {
  value: BasicMessageFilterValueTarget,
  onChange: (v: BasicMessageFilterValueTarget) => void,
  isReadOnly?: boolean
};

const BasicMessageFilterValueTargetInput: React.FC<BasicMessageFilterValueTargetInputProps> = (props) => {
  return (
    <div className={s.BasicMessageFilterValueTargetInput}>
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

export default BasicMessageFilterValueTargetInput;
