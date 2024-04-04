import React from 'react';
import s from './FixedJsonGeneratorInput.module.css'
import { FixedJsonGenerator } from '../fixed-json-generator';
import CodeEditor from '../../../../../../CodeEditor/CodeEditor';

export type FixedJsonGeneratorInputProps = {
  value: FixedJsonGenerator,
  onChange: (v: FixedJsonGenerator) => void
};

const FixedJsonGeneratorInput: React.FC<FixedJsonGeneratorInputProps> = (props) => {
  return (
    <div className={s.FixedJsonGeneratorInput}>
      <CodeEditor
        value={props.value.json}
        onChange={(v) => props.onChange({ ...props.value, json: v || '' })}
        language='json'
        height={200}
      />
    </div>
  );
}

export default FixedJsonGeneratorInput;
