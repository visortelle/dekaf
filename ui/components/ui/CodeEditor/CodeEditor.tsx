import React from 'react';
import Editor, { EditorProps, Monaco } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

import s from './CodeEditor.module.css'

export type CodeEditorProps = EditorProps & {
  autoComplete?: (monaco: Monaco) => void,
};

const CodeEditor: React.FC<CodeEditorProps> = (props) => {

  const { options, autoComplete, ...restProps } = props;

  return (
    <div className={s.CodeEditor}>
      <Editor
        beforeMount={(monaco) => autoComplete && autoComplete(monaco)}
        options={{
          minimap: { enabled: false },
          scrollbar: { alwaysConsumeMouseWheel: false, useShadows: false },
          theme: 'vs',
          fontFamily: 'Fira Code',
          fontSize: parseFloat(getComputedStyle(document.documentElement).fontSize) * 14,
          ...options,
        }}
        {...restProps}
      />
    </div>
  );
}

export default CodeEditor;
