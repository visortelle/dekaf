import React from 'react';
import s from './Notes.module.css'
import MarkdownPreview from '../../../../ui/MarkdownEditor/MarkdownPreview/MarkdownPreview';
import markdown from './sample.md';

console.log('md', markdown);

export type NotesProps = {};

const Notes: React.FC<NotesProps> = (props) => {
  return (
    <div className={s.Notes}>
      <MarkdownPreview
        markdown={markdown}
      />
    </div>
  );
}

export default Notes;
