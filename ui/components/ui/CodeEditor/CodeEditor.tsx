import React, { useEffect } from 'react';
import Editor, { EditorProps, Monaco, loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { IRange } from 'monaco-editor';

import s from './CodeEditor.module.css';
import * as Theme from '../../app/contexts/Theme/Theme';

// @monaco-editor/react fetches Monaco at runtime through its own AMD loader, and its default base
// is cdn.jsdelivr.net - so every code editor here depended on the public internet: seconds of
// third-party network before the first editor mounts, and no editor at all when jsdelivr is
// unreachable (offline, air-gapped, or blocked). Dekaf serves the identical files itself
// (ui/build.js copies monaco-editor/min/vs next to the bundle), so resolve them from our own
// origin. Absolute-ised against document.baseURI because the loader also builds worker URLs from
// this value, and those are not resolved against the page's <base href>.
loader.config({ paths: { vs: new URL('ui/static/dist/vs', document.baseURI).toString() } });

export type Dependencies = {
  label: string,
  documentation: string,
  insertText: string,
}

export type AutoCompleteConfig = {
  match: string | RegExp,
  dependencies: Dependencies[],
  language: string,
  kind: 'Function' | 'Value' | 'Method' | 'Constructor' | 'Field' | 'Variable' | 'Class' | 'Struct' | 'Interface' | 'Module' | 'Property' | 'Event' | 'Operator' | 'Unit' | 'Constant' | 'Enum' | 'EnumMember' | 'Keyword' | 'Text' | 'Color' | 'File' | 'Reference' | 'Customcolor' | 'Folder' | 'TypeParameter' | 'User' | 'Issue' | 'Snippet'
}
export type CodeEditorProps = EditorProps & {
  autoCompleteConfig?: AutoCompleteConfig,
  isReadOnly?: boolean
};

// vs-dark with the app's dark background, so editors don't sit as grey boxes on the page.
const darkThemeName = 'dekaf-dark';
const defineDarkTheme = (monaco: Monaco) => {
  monaco.editor.defineTheme(darkThemeName, {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: { 'editor.background': '#17181d' },
  });
};

const CodeEditor: React.FC<CodeEditorProps> = (props) => {
  const { options, autoCompleteConfig, ...restProps } = props;
  const { theme } = Theme.useContext();

  let register: monaco.IDisposable | null = null

  const addAutoCompletion = (monaco: Monaco) => {
    if (!autoCompleteConfig) {
      return
    }

    const createDependencyProposals = (range: IRange) => {

      const newDependencies = autoCompleteConfig.dependencies.map(dependence => {
        return {
          ...dependence, range: range,
          kind: monaco.languages.CompletionItemKind[autoCompleteConfig.kind],
        }
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
        beforeMount={(monaco) => {
          defineDarkTheme(monaco);
          addAutoCompletion(monaco);
        }}
        theme={theme === 'dark' ? darkThemeName : 'vs'}
        options={{
          readOnly: props.isReadOnly,
          minimap: { enabled: false },
          scrollbar: { alwaysConsumeMouseWheel: false, useShadows: false, verticalScrollbarSize: 5, horizontalScrollbarSize: 5 },
          fontSize: parseFloat(getComputedStyle(document.documentElement).fontSize) * 14,
          automaticLayout: true,
          ...options,
        }}
        {...restProps}
      />
    </div>
  );
}

export default CodeEditor;
