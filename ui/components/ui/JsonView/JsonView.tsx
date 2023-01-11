import React from 'react';

import CodeEditor from '../CodeEditor/CodeEditor';
import { KeyValues } from '../KeyValueEditor/KeyValueEditor';

import s from './JsonView.module.css'

export type JsonViewProps = {
  json?: string;
  value?: KeyValues;
  height: string;
  width: string;
  readonly?: boolean;
  onChange?: (keyValues: KeyValues) => void;
  changeValidity?: (validity: boolean) => void;
};

const JsonView: React.FC<JsonViewProps> = (props) => {

  const onChange = (json?: string) => {
    if (!props.changeValidity) {
      return
    }

    try {
      if (props.changeValidity && props.onChange && json) {
        props.onChange(JSON.parse(json));
        props.changeValidity(true);
      }
    } catch (err) {
      props.changeValidity(false);
    }
  }

  return (
    <div className={s.JsonView}>
      <CodeEditor
        value={
          props.json ?
          JSON.stringify(JSON.parse(props.json), null, 2) :
          JSON.stringify(props.value, null, 2)
        }
        language='json'
        height={props.height}
        width={props.width}
        options={{ readOnly: Boolean(props.readonly) }}
        onChange={onChange}
      />
    </div>
  );
}

export default JsonView;
