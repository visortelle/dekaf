import React, { useEffect, useMemo, useState } from 'react';
import s from './MergeView.module.css'
import CodeMirrorMerge from 'react-codemirror-merge';
import { githubLight } from '@uiw/codemirror-theme-github';
import { EditorView } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import Button from '../Button/Button';

const Original = CodeMirrorMerge.Original;
const Modified = CodeMirrorMerge.Modified;

export type MergeViewProps = {
  originalFileName: string,
  originalContent: string,
  modifiedContent: string,
  modifiedFileName: string,
  language: 'plaintext' | 'javascript' | 'json',
  onMerge: (v: string) => void
};

const MergeView: React.FC<MergeViewProps> = (props) => {
  const [originalContent, setOriginalContent] = useState(props.originalContent);
  const [modifiedContent, setModifiedContent] = useState(props.modifiedContent);

  useEffect(() => {
    setOriginalContent(props.originalContent);
  }, [props.originalContent]);

  useEffect(() => {
    setModifiedContent(props.modifiedContent);
  }, [props.modifiedContent]);

  const extensions = useMemo(() => {
    if (props.language === 'json') {
      return [json()];
    } else if (props.language === 'javascript') {
      return [javascript()]
    }

    return [];
  }, [props.language]);

  return (
    <div className={s.MergeView} style={{ display: 'flex', flexDirection: 'column', flex: '1', border: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', padding: '12rem', background: 'var(--surface-color)' }}>
        <div style={{ flex: '1 1 50%', padding: '0 12rem', textAlign: 'center' }}><strong>{props.originalFileName}</strong></div>
        <div style={{ flex: '1 1 50%', padding: '0 12rem', textAlign: 'center' }}><strong>{props.modifiedFileName}</strong></div>
      </div>

      <CodeMirrorMerge theme={githubLight} orientation="a-b" revertControls='a-to-b' collapseUnchanged={{ margin: 3, minSize: 3 }}>
        <Original extensions={[...extensions, EditorView.lineWrapping]} value={originalContent} />
        <Modified extensions={[EditorView.lineWrapping, ...extensions]} value={modifiedContent} onChange={setModifiedContent} />
      </CodeMirrorMerge>

      <div style={{ display: 'flex', flex: '1', padding: '12rem', background: 'var(--surface-color)' }}>
        <div style={{ display: 'flex', flex: '1', justifyContent: 'center' }}>
          <Button
            type='primary'
            text='Finish merge and use Left'
            onClick={() => props.onMerge(originalContent)}
          />
        </div>

        <div style={{ display: 'flex', flex: '1', justifyContent: 'center' }}>
          <Button
            type='primary'
            text='Finish merge and use Right'
            onClick={() => props.onMerge(modifiedContent)}
          />
        </div>
      </div>
    </div>
  );
}

export default MergeView;
