import React from 'react';
import s from './JsJsonGeneratorInput.module.css'
import { JsJsonGenerator } from '../js-json-generator';

export type JsJsonGeneratorInputProps = {
  value: JsJsonGenerator,
  onChange: (v: JsJsonGenerator) => void
};

const JsJsonGeneratorInput: React.FC<JsJsonGeneratorInputProps> = (props) => {
  return (
    <div className={s.JsJsonGeneratorInput}>
      js json generator
    </div>
  );
}

export default JsJsonGeneratorInput;
