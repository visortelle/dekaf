import React from 'react';
import s from './JsJsonModifier.module.css'
import { JsJsonModifier } from '../json-modifier/json-modifier-types';
import CodeEditor from '../../CodeEditor/CodeEditor';

export type JsJsonModifierProps = {
  value: JsJsonModifier,
  onChange: (v: JsJsonModifier) => void
};

const JsJsonModifier: React.FC<JsJsonModifierProps> = (props) => {
  return (
    <div className={s.JsJsonModifier}>
      <CodeEditor
        value={props.value.jsCode}
        onChange={(v) => props.onChange({ ...props.value, jsCode: v || '' })}
        height={80}
        language='javascript'
      />
    </div>
  );
}

export default JsJsonModifier;
