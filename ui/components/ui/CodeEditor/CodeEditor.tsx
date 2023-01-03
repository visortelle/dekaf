import React, { useEffect } from 'react';
import Editor, { EditorProps, Monaco } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { IRange } from 'monaco-editor';

import s from './CodeEditor.module.css';

export type Dependencies = {
  label: string,
  documentation: string,
  insertText: string,
  // kind: monaco.languages.CompletionItemKind,
}

export type AutoCompleteConfig = {
  match: string | RegExp,
  dependencies: Dependencies[],
  language: string,
  kind: 'Function' | 'Value' | 'Method' | 'Constructor' | 'Field' | 'Variable' | 'Class' | 'Struct' | 'Interface' | 'Module' | 'Property' | 'Event' | 'Operator' | 'Unit' | 'Constant' | 'Enum' | 'EnumMember' | 'Keyword' | 'Text' | 'Color' | 'File' | 'Reference' | 'Customcolor' | 'Folder' | 'TypeParameter' | 'User' | 'Issue' | 'Snippet'
}
export type CodeEditorProps = EditorProps & {
  autoCompleteConfig?: AutoCompleteConfig
};

const CodeEditor: React.FC<CodeEditorProps> = (props) => {

  const { options, autoCompleteConfig, ...restProps } = props;

  let register: monaco.IDisposable | null = null

  const addAutoComplition = (monaco: Monaco) => {
    if (!autoCompleteConfig) {
      return
    }

    const createDependencyProposals = (range: IRange) => {

      const newDependencies = autoCompleteConfig.dependencies.map(dependence => {
        return { ...dependence, range: range, 
          kind: monaco.languages.CompletionItemKind[autoCompleteConfig.kind], }
      });

      return newDependencies;
    }
    
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({ noLib: false, allowNonTsExtensions: true })

    register = monaco.languages.registerCompletionItemProvider(autoCompleteConfig.language, {
      triggerCharacters: ["."],
      provideCompletionItems: (model, position) => {

        const textUntilPosition = model.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        })

        const match = textUntilPosition.match(
          autoCompleteConfig.match
        )

        if (!match) {
          return { suggestions: [] };
        }
        
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        }
        return {
          suggestions: createDependencyProposals(range)
        }
      },
      
    });
  }

  useEffect(() => {
    return () => {
      if (register) {
        register.dispose()
      }
    }
  }, [])

  return (
    <div className={s.CodeEditor}>
      <Editor
        beforeMount={(monaco) => addAutoComplition(monaco)}
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
