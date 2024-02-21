import React from 'react';
import s from './BasicMessageFilterValueTargetInput.module.css'
import { BasicMessageFilterCurrentMessageValueTarget } from '../../../../../../basic-message-filter-types';
import Input from '../../../../../../../Input/Input';

export type BasicMessageFilterValueTargetInputProps = {
  value: BasicMessageFilterCurrentMessageValueTarget,
  onChange: (v: BasicMessageFilterCurrentMessageValueTarget) => void,
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
