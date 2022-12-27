import React from 'react';
import Editor, { EditorProps } from "@monaco-editor/react";

import s from './CodeEditor.module.css'

export type CodeEditorProps = EditorProps;

const CodeEditor: React.FC<CodeEditorProps> = (props) => {
  const { options, ...restProps } = props;

  const onMount = (monaco: any) => {
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemas: [
        {
          uri: "http://myserver/foo-schema.json",
          schema: {
            type: "object",
            properties: {
              p1: {
                enum: ["v1", "v2"],
              },
              p2: {
                $ref: "http://myserver/bar-schema.json",
              },
            },
          },
        },
        {
          uri: "http://myserver/bar-schema.json",
          schema: {
            type: "object",
            properties: {
              q1: {
                enum: ["x1", "x2"],
              },
            },
          },
        },
      ],
    });
  };

  return (
    <div className={s.CodeEditor}>
      <Editor
        onMount={onMount}
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
