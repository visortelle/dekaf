import React from 'react';
import s from './CodeEditor.module.css'
import Editor, { EditorProps, useMonaco } from "@monaco-editor/react";

export type CodeEditorProps = EditorProps;

const CodeEditor: React.FC<CodeEditorProps> = (props) => {
  const { options, ...restProps } = props;

  return (
    <div className={s.CodeEditor}>
      <Editor
        options={{
          minimap: { enabled: false },
          scrollbar: { alwaysConsumeMouseWheel: false, useShadows: false },
          theme: 'vs',
          fontFamily: 'Fira Code',
          fontSize: parseFloat(getComputedStyle(document.documentElement).fontSize) * 14,
          ...options
        }}
        {...restProps}
      />
    </div>
  );
}

export default CodeEditor;
