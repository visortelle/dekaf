import React, { useEffect, useRef } from 'react';
import s from './MarkdownEditor.module.css'
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { githubLight } from '@uiw/codemirror-theme-github';
import MarkdownPreview from '../MarkdownPreview/MarkdownPreview';
import A from '../../A/A';

export type MarkdownEditorProps = {
  value: string,
  onChange: (v: string) => void,
  isReadOnly?: boolean
};

const MarkdownEditor: React.FC<MarkdownEditorProps> = (props) => {
  const divRef1 = useRef<HTMLDivElement>(null);
  const divRef2 = useRef<HTMLDivElement>(null);

  const syncScroll = (sourceRef: React.RefObject<HTMLDivElement>, targetRef: React.RefObject<HTMLDivElement>) => {
    if (!sourceRef.current || !targetRef.current) {
      return;
    };

    const source = sourceRef.current;
    const target = targetRef.current;
    const scrollRatio = source.scrollTop / (source.scrollHeight - source.clientHeight);
    target.scrollTop = scrollRatio * (target.scrollHeight - target.clientHeight);
  };

  useEffect(() => {
    if (!divRef1.current || !divRef2.current) {
      return;
    }

    const handleScroll1 = () => syncScroll(divRef1, divRef2);
    const handleScroll2 = () => syncScroll(divRef2, divRef1);

    const div1 = divRef1.current;
    const div2 = divRef2.current;

    div1.addEventListener('wheel', handleScroll1);
    div2.addEventListener('wheel', handleScroll2);

    return () => {
      div1.removeEventListener('wheel', handleScroll1);
      div2.removeEventListener('wheel', handleScroll2);
    };
  }, [divRef1.current, divRef2.current]);

  useEffect(() => {
    syncScroll(divRef1, divRef2);
  }, [props.value]);

  return (
    <div className={s.MarkdownEditor}>
      <div className={s.LeftPanel} ref={divRef1}>
        <CodeMirror
          value={props.value}
          onChange={props.onChange}
          extensions={[markdown({ defaultCodeLanguage: markdownLanguage })]}
          theme={githubLight}
        />
      </div>

      <div className={s.RightPanel} ref={divRef2}>
        <MarkdownPreview markdown={props.value} />
      </div>
    </div>
  );
}

export default MarkdownEditor;
