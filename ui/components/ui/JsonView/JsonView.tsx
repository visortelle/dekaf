import React from 'react';

import CodeEditor from '../CodeEditor/CodeEditor';

import s from './JsonView.module.css'

export type JsonViewProps = {
  json: string;
  height: string;
  width: string;
  readonly?: boolean;
  onChange?: (json?: string) => void;
};

const JsonView: React.FC<JsonViewProps> = (props) => {

  return (
    <div className={s.JsonView}>
      <CodeEditor
        value={JSON.stringify(JSON.parse(props.json), null, 4)}
        language={'json'}
        height={props.height}
        width={props.width}
        options={{ readOnly: props.readonly !== undefined ? props.readonly : true }}
        onChange={props.onChange}
      />
    </div>
  );
}

export default JsonView;
