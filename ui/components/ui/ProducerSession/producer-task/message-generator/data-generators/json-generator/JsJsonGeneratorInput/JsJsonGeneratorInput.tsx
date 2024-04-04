import React from 'react';
import s from './JsJsonGeneratorInput.module.css'
import { JsJsonGenerator } from '../js-json-generator';
import CodeEditor from '../../../../../../CodeEditor/CodeEditor';

export type JsJsonGeneratorInputProps = {
  value: JsJsonGenerator,
  onChange: (v: JsJsonGenerator) => void
};

const JsJsonGeneratorInput: React.FC<JsJsonGeneratorInputProps> = (props) => {
  return (
    <div className={s.JsJsonGeneratorInput}>
      <CodeEditor
        value={props.value.jsCode}
        onChange={(v) => props.onChange({ ...props.value, jsCode: v || '' })}
        language='javascript'
        height={200}
      />
    </div>
  );
}

export default JsJsonGeneratorInput;
