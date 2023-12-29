import React from 'react';
import s from './JsonModifierInput.module.css'
import { JsonModifier } from './json-modifier/json-modifier-types';
import JsJsonModifier from './JsJsonModifierInput/JsJsonModifierInput';

export type JsonModifierInputProps = {
  value: JsonModifier,
  onChange: (v: JsonModifier) => void
};

const JsonModifierInput: React.FC<JsonModifierInputProps> = (props) => {
  return (
    <div className={s.JsonModifierInput}>
      <JsJsonModifier
        value={props.value.modifier}
        onChange={(v) => props.onChange({ ...props.value, modifier: v })}
      />
    </div>
  );
}

export default JsonModifierInput;
