import React from 'react';
import s from './JsonView.module.css'
import CodeEditor from '../CodeEditor/CodeEditor';

export type JsonViewProps = {
  json: string;
  height: string;
  width: string;
};

const JsonView: React.FC<JsonViewProps> = (props) => {
  return (
    <div className={s.JsonView}>
      <CodeEditor
        value={props.json}
        language={'json'}
        height={props.height}
        width={props.width}
        options={{ readOnly: true }}
      />
    </div>
  );
}

export default JsonView;
