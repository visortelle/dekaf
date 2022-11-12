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
        value={JSON.stringify(JSON.parse(props.json), null, 4)}
        language={'json'}
        height={props.height}
        width={props.width}
        options={{ readOnly: true }}
      />
    </div>
  );
}

export default JsonView;
