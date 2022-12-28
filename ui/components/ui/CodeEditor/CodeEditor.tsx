import React, { useEffect, useState } from 'react';
import Editor, { EditorProps, Monaco } from "@monaco-editor/react";
import { IRange } from 'monaco-editor';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

import s from './CodeEditor.module.css'

export type CodeEditorProps = EditorProps & {
  fullMonaco?: (monaco: Monaco) => void
};



const CodeEditor: React.FC<CodeEditorProps> = (props) => {

  const { options, fullMonaco, ...restProps } = props;

  const [monaco, setMonaco] = useState<Monaco | null>(null);

  // useEffect(() => {

  //   if (!monaco) {
  //     return
  //   }

  //   const createDependencyProposals = (range: IRange) => {
  //     return [
  //       {
  //         label: 'properties',
  //         kind: monaco.languages.CompletionItemKind.Function,
  //         documentation: 'More about ...',
  //         insertText: 'properties()',
  //         range: range
  //       },
  //       {
  //         label: 'eventTime',
  //         kind: monaco.languages.CompletionItemKind.Function,
  //         documentation: 'More about ...',
  //         insertText: 'eventTime()',
  //         range: range
  //       },
  //       {
  //         label: 'publishTime',
  //         kind: monaco.languages.CompletionItemKind.Function,
  //         documentation: 'More about ...',
  //         insertText: 'publishTime()',
  //         range: range
  //       },
  //       {
  //         label: 'brokerPublishTime',
  //         kind: monaco.languages.CompletionItemKind.Function,
  //         documentation: 'More about ...',
  //         insertText: 'brokerPublishTime()',
  //         range: range
  //       },
  //       {
  //         label: 'messageId',
  //         kind: monaco.languages.CompletionItemKind.Function,
  //         documentation: 'More about ...',
  //         insertText: 'messageId()',
  //         range: range
  //       },
  //       {
  //         label: 'sequenceId',
  //         kind: monaco.languages.CompletionItemKind.Function,
  //         documentation: 'More about ...',
  //         insertText: 'sequenceId()',
  //         range: range
  //       },
  //       {
  //         label: 'producerName',
  //         kind: monaco.languages.CompletionItemKind.Function,
  //         documentation: 'More about ...',
  //         insertText: 'producerName()',
  //         range: range
  //       },
  //       {
  //         label: 'key',
  //         kind: monaco.languages.CompletionItemKind.Function,
  //         documentation: 'More about ...',
  //         insertText: 'key()',
  //         range: range
  //       },
  //       {
  //         label: 'orderingKey',
  //         kind: monaco.languages.CompletionItemKind.Function,
  //         documentation: 'More about ...',
  //         insertText: 'orderingKey()',
  //         range: range
  //       },
  //       {
  //         label: 'topic',
  //         kind: monaco.languages.CompletionItemKind.Function,
  //         documentation: 'More about ...',
  //         insertText: 'topic()',
  //         range: range
  //       },
  //       {
  //         label: 'size',
  //         kind: monaco.languages.CompletionItemKind.Function,
  //         documentation: 'More about ...',
  //         insertText: 'size()',
  //         range: range
  //       },
  //       {
  //         label: 'redeliveryCount',
  //         kind: monaco.languages.CompletionItemKind.Function,
  //         documentation: 'More about ...',
  //         insertText: 'redeliveryCount()',
  //         range: range
  //       },
  //       {
  //         label: 'schemaVersion',
  //         kind: monaco.languages.CompletionItemKind.Function,
  //         documentation: 'More about ...',
  //         insertText: 'schemaVersion()',
  //         range: range
  //       },
  //       {
  //         label: 'isReplicated',
  //         kind: monaco.languages.CompletionItemKind.Function,
  //         documentation: 'More about ...',
  //         insertText: 'isReplicated()',
  //         range: range
  //       },
  //       {
  //         label: 'replicatedFrom',
  //         kind: monaco.languages.CompletionItemKind.Function,
  //         documentation: 'More about ...',
  //         insertText: 'replicatedFrom()',
  //         range: range
  //       },
  //     ];
  //   }
    
  //   monaco.languages.typescript.javascriptDefaults.setCompilerOptions({})

  //   monaco.languages.registerCompletionItemProvider('javascript', {
  //     provideCompletionItems: function (model, position) {
    
  //       const textUntilPosition = model.getValueInRange({
  //         startLineNumber: 1,
  //         startColumn: 1,
  //         endLineNumber: position.lineNumber,
  //         endColumn: position.column
  //       })
  //       const match = textUntilPosition.match(
  //         /msg.*/
  //       )
  //       if (!match) {
  //         return { suggestions: [] };
  //       }
  //       const word = model.getWordUntilPosition(position);
  //       const range = {
  //         startLineNumber: position.lineNumber,
  //         endLineNumber: position.lineNumber,
  //         startColumn: word.startColumn,
  //         endColumn: word.endColumn
  //       }
  //       return {
  //         suggestions: createDependencyProposals(range)
  //       }
  //     },
      
  //   });

  //   console.log("I'm a live")

  // }, [monaco])



  return (
    <div className={s.CodeEditor}>
      <Editor
        beforeMount={(monaco) => fullMonaco && fullMonaco(monaco)}
        // onMount={(editor, monaco) => onMount(monaco, editor)}
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
