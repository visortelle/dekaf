import React, { ReactNode } from 'react';
import s from './BooleanFilterInput.module.css'
import { BooleanFilterDescriptor, BooleanFilterValue } from '../types';
import Checkbox from '../../../Checkbox/Checkbox';

export type BooleanFilterInputProps = {
  title: ReactNode;
  descriptor: BooleanFilterDescriptor;
  value: BooleanFilterValue;
  onChange: (value: BooleanFilterValue) => void;
};

const BooleanFilterInput: React.FC<BooleanFilterInputProps> = (props) => {
  return (
    <div className={s.BooleanFilterInput}>
      <div className={s.Title}>
        <strong>{props.title}</strong>
      </div>

      <div className={s.Input}>
        <Checkbox
          checked={props.value.value}
          onChange={(v) => props.onChange({ type: 'boolean', value: v })}
        />
      </div>
    </div>
  );
}

export default BooleanFilterInput;
