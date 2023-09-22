import React from 'react';

import CodeEditor from '../../../../../../ui/CodeEditor/CodeEditor';
import * as autocomplete from './autocomplete';
import * as t from '../../../../types';

import s from './JsFilterEditor.module.css'

export const defaultJsFilterCode = `({ key, value, accum }) => {
  return true;
}`;

export type JsFilterEditorProps = {
  value: t.JsMessageFilter;
  onChange: (value: t.JsMessageFilter) => void;
};

export const defaultJsValue = `({ value, accum }) => {
  return true
}`;

const JsFilterEditor: React.FC<JsFilterEditorProps> = (props) => {
  return (
    <div className={s.JsFilterEditor}>
      <div className={s.FormControl}>
        <CodeEditor
          value={props.value.jsCode}
          onChange={v => props.onChange({ ...props.value, jsCode: v || '' })}
          height="180rem"
          language="javascript"
          // TODO remove the autocomplete configuration, when it will be possible to select\configure it directly in the codeEditor.
          autoCompleteConfig={{ language: 'javascript', match: /msg\./, dependencies: autocomplete.dependencies, kind: 'Function' }}
        />
      </div>
    </div>
  );
}

export default JsFilterEditor;
