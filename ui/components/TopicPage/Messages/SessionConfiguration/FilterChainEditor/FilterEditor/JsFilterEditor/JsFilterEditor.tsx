import React from 'react';

import CodeEditor from '../../../../../../ui/CodeEditor/CodeEditor';
import * as autocomplete from './autocomplete';
import * as t from '../../../../types';

import s from './JsFilterEditor.module.css'

export const defaultJsFilterValue: t.JsMessageFilter = {
  jsCode: `({ key, value, state }) => {
  return true;
}`
};

export type JsFilterEditorProps = {
  value: t.JsMessageFilter;
  onChange: (value: t.JsMessageFilter) => void;
  isReadOnly?: boolean;
};

const JsFilterEditor: React.FC<JsFilterEditorProps> = (props) => {
  return (
    <div className={s.JsFilterEditor}>
      <div className={s.FormControl}>
        <CodeEditor
          value={props.value.jsCode}
          onChange={v => props.onChange({ ...props.value, jsCode: v || '' })}
          height="140rem"
          language="javascript"
          // TODO remove the autocomplete configuration, when it will be possible to select\configure it directly in the codeEditor.
          autoCompleteConfig={{ language: 'javascript', match: /msg\./, dependencies: autocomplete.dependencies, kind: 'Function' }}
          isReadOnly={props.isReadOnly}
        />
      </div>
    </div>
  );
}

export default JsFilterEditor;
