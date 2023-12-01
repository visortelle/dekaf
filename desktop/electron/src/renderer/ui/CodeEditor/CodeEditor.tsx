import React, { useMemo } from 'react';
import s from './CodeEditor.module.css'

import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { githubLight } from '@uiw/codemirror-theme-github';

export type CodeEditorProps = {
  value: string,
  onChange: (v: string) => void,
  language: 'plaintext' | 'javascript' | 'json',
  height?: string
};

const CodeEditor: React.FC<CodeEditorProps> = (props) => {
  const extensions = useMemo(() => {
    if (props.language === 'json') {
      return [json()];
    } else if (props.language === 'javascript') {
      return [javascript()]
    }
  }, [props.language]);

  return (
    <div className={s.CodeEditor}>
      <CodeMirror
        value={props.value}
        onChange={props.onChange}
        extensions={extensions}
        theme={githubLight}
        height={props.height}
      />
    </div>
  );
}

export default CodeEditor;
