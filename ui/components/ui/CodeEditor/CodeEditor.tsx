import React, { useEffect } from 'react';
import Editor, { EditorProps, Monaco, OnMount } from "@monaco-editor/react";
import loader from '@monaco-editor/loader';
import { IRange,  } from 'monaco-editor';
// import { IStandaloneCodeEditor } from 'monaco-editor/esm/vs/editor/editor.api'

import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';


import s from './CodeEditor.module.css'

export type CodeEditorProps = EditorProps;

const CodeEditor: React.FC<CodeEditorProps> = (props) => {
  const { options, ...restProps } = props;

  const editorWillMount = (monaco: Monaco, editor: monaco.editor.IStandaloneCodeEditor) => {

    const createDependencyProposals = (range: IRange) => {
      return [
        {
          label: 'properties',
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: 'More about ...',
          insertText: 'properties: [key -> value]',
          range: range
        },
        {
          label: 'eventTime',
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: 'More about ...',
          insertText: 'eventTime: 10',
          range: range
        },
        {
          label: 'publishTime',
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: 'More about ...',
          insertText: 'publishTime: 10',
          range: range
        },
        {
          label: 'brokerPublishTime',
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: 'More about ...',
          insertText: 'brokerPublishTime: 10',
          range: range
        },
        {
          label: 'messageId',
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: 'More about ...',
          insertText: 'messageId: [10, 20, 30]',
          range: range
        },
        {
          label: 'sequenceId',
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: 'More about ...',
          insertText: 'sequenceId: 10',
          range: range
        },
        {
          label: 'producerName',
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: 'More about ...',
          insertText: 'producerName: producer-1',
          range: range
        },
        {
          label: 'key',
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: 'More about ...',
          insertText: 'key: key-1',
          range: range
        },
        {
          label: 'orderingKey',
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: 'More about ...',
          insertText: 'orderingKey: [10, 20, 30]',
          range: range
        },
        {
          label: 'topic',
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: 'More about ...',
          insertText: 'topic: topic-1',
          range: range
        },
        {
          label: 'size',
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: 'More about ...',
          insertText: 'size: 10',
          range: range
        },
        {
          label: 'redeliveryCount',
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: 'More about ...',
          insertText: 'redeliveryCount: 10',
          range: range
        },
        {
          label: 'schemaVersion',
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: 'More about ...',
          insertText: 'schemaVersion: 10',
          range: range
        },
        {
          label: 'isReplicated',
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: 'More about ...',
          insertText: 'isReplicated: true',
          range: range
        },
        {
          label: 'replicatedFrom',
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: 'More about ...',
          insertText: 'replicatedFrom: replicatedFrom-1',
          range: range
        },
      ];
    }
    
    // monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
    //   allowJs: true,
    //   allowSyntheticDefaultImports: true,
    //   allowUmdGlobalAccess: true,
    //   allowUnreachableCode: true,
    //   allowUnusedLabels: true,

    //   alwaysStrict: true,
    //   checkJs: true,
    //   declaration: true,
    //   declarationMap: true,
    //   emitDeclarationOnly: true,
    //   disableSizeLimit: true,
    //   disableSourceOfProjectReferenceRedirect: true,
    //   downlevelIteration: true,
    //   emitBOM: true,
    //   emitDecoratorMetadata: true,
    //   experimentalDecorators: true,
    //   forceConsistentCasingInFileNames: true,
    //   importHelpers: true,
    //   inlineSourceMap: true,
    //   inlineSources: true,
    //   isolatedModules: true,
    //   keyofStringsOnly: true,
    //   preserveConstEnums: true,
    //   preserveSymlinks: true,
    //   composite: true,
    //   removeComments: true,
    //   skipLibCheck: true,
    //   skipDefaultLibCheck: true,
    //   sourceMap: true,
    //   strict: true,
    //   strictFunctionTypes: true,
    //   strictBindCallApply: true,
    //   strictNullChecks: true,
    //   strictPropertyInitialization: true,
    //   stripInternal: true,
    //   suppressExcessPropertyErrors: true,
    //   suppressImplicitAnyIndexErrors: true,
    //   traceResolution: true,
    //   resolveJsonModule: true,
    //   esModuleInterop: true,
    //   useDefineForClassFields: true,

    //   noEmit: false,
    //   noEmitHelpers: false,
    //   noEmitOnError: false,
    //   noErrorTruncation: false,
    //   noFallthroughCasesInSwitch: false,
    //   noImplicitAny: false,
    //   noImplicitReturns: false,
    //   noImplicitThis: false,
    //   noStrictGenericChecks: false,
    //   noUnusedLocals: false,
    //   noUnusedParameters: false,
    //   noImplicitUseStrict: false,
    //   noLib: false,
    //   noResolve: false,
    // })

    // monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    //   noSemanticValidation: false,
    //   noSyntaxValidation: false,
    // });

    monaco.languages.registerCompletionItemProvider('javascript', {
      provideCompletionItems: function (model, position) {
    
        const textUntilPosition = model.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        })
        const match = textUntilPosition.match(
          // /"dependencies"\s*:\s*\{\s*("[^"]*"\s*:\s*"[^"]*"\s*,\s*)*([^"]*)?$/
          // /msg.*/
          /msg.*?$/
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
      }
    });
  }
  

  return (
    <div className={s.CodeEditor}>
      <Editor
        onMount={(editor, monaco) => editorWillMount(monaco, editor)}
        options={{
          minimap: { enabled: false },
          scrollbar: { alwaysConsumeMouseWheel: false, useShadows: false },
          theme: 'vs',
          fontFamily: 'Fira Code',
          fontSize: parseFloat(getComputedStyle(document.documentElement).fontSize) * 14,
          ...options,
          suggest: {
            showFunctions: false
          }
        }}
        {...restProps}
      />
    </div>
  );
}

export default CodeEditor;
