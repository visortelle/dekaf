import React from 'react';
import s from './FixedJsonGeneratorInput.module.css'
import { FixedJsonGenerator } from '../fixed-json-generator';

export type FixedJsonGeneratorInputProps = {
  value: FixedJsonGenerator,
  onChange: (v: FixedJsonGenerator) => void
};

const FixedJsonGeneratorInput: React.FC<FixedJsonGeneratorInputProps> = (props) => {
  return (
    <div className={s.FixedJsonGeneratorInput}>
      fixed json generator
    </div>
  );
}

export default FixedJsonGeneratorInput;
