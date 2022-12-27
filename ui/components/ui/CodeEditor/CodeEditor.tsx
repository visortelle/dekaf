import React, { useEffect } from 'react';
import Editor, { EditorProps } from "@monaco-editor/react";
import loader from '@monaco-editor/loader';

import s from './CodeEditor.module.css'

export type CodeEditorProps = EditorProps;

const CodeEditor: React.FC<CodeEditorProps> = (props) => {
  const { options, ...restProps } = props;

  useEffect(() => {
    loader.init().then((monaco) => {
      // Register a new language
      monaco.languages.register({ id: 'mySpecialLanguage' });

      // Register a tokens provider for the language
      monaco.languages.setMonarchTokensProvider('mySpecialLanguage', {
        tokenizer: {
          root: [
            [/\[error.*/, 'custom-error'],
            [/\[notice.*/, 'custom-notice'],
            [/\[info.*/, 'custom-info'],
            [/\[[a-zA-Z 0-9:]+\]/, 'custom-date'],
          ],
        },
      });

      // Define a new theme that contains only rules that match this language
      monaco.editor.defineTheme('myCoolTheme', {
        base: 'vs',
        inherit: false,
        rules: [
          { token: 'custom-info', foreground: '808080' },
          { token: 'custom-error', foreground: 'FF0000', fontStyle: 'bold' },
          { token: 'custom-notice', foreground: 'FFA500' },
          { token: 'custom-date', foreground: '008800' },
        ],
        colors: {
          'editor.foreground': '#000000',
        },
      });

      // Register a completion item provider for the new language
      monaco.languages.registerCompletionItemProvider('mySpecialLanguage', {
        provideCompletionItems: () => {
          var suggestions = [
            {
              label: 'simpleText',
              kind: monaco.languages.CompletionItemKind.Text,
              insertText: 'simpleText',
            },
            {
              label: 'testing',
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: 'testing(${1:condition})',
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            },
            {
              label: 'ifelse',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: [
                'if (${1:condition}) {',
                '\t$0',
                '} else {',
                '\t',
                '}',
              ].join('\n'),
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'If-Else Statement',
            },
          ];
          return { suggestions: suggestions };
        },
      })
    })
  }, [])

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
