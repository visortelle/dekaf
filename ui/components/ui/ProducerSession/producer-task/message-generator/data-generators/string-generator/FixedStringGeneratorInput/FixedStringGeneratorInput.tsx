import React from 'react';
import s from './FixedStringGeneratorInput.module.css'
import { FixedStringGenerator } from '../fixed-string-generator';

export type FixedStringGeneratorInputProps = {
  value: FixedStringGenerator,
  onChange: (v: FixedStringGenerator) => void
};

const FixedStringGeneratorInput: React.FC<FixedStringGeneratorInputProps> = (props) => {
  return (
    <div className={s.FixedStringGeneratorInput}>
      fixed string generator
    </div>
  );
}

export default FixedStringGeneratorInput;
