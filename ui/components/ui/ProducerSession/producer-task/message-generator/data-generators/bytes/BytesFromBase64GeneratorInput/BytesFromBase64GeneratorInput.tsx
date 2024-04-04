import React from 'react';
import s from './BytesFromBase64GeneratorInput.module.css'
import { BytesFromBase64Generator } from '../bytes-from-base64-generator';

export type BytesFromBase64GeneratorInputProps = {
  value: BytesFromBase64Generator,
  onChange: (v: BytesFromBase64Generator) => void
};

const BytesFromBase64GeneratorInput: React.FC<BytesFromBase64GeneratorInputProps> = (props) => {
  return (
    <div className={s.BytesFromBase64GeneratorInput}>

    </div>
  );
}

export default BytesFromBase64GeneratorInput;
