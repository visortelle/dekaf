import React from 'react';
import s from './BasicFilterEditor.module.css'

export type BasicFilterEditorProps = {};

const BasicFilterEditor: React.FC<BasicFilterEditorProps> = (props) => {
  return (
    <div className={s.BasicFilterEditor}>
      Basic filters aren't available at this moment.
    </div>
  );
}

export default BasicFilterEditor;
