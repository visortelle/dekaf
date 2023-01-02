import React, { useEffect } from 'react';
import { Monaco } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

import CodeEditor from '../../../../ui/CodeEditor/CodeEditor';
import * as t from './types';

import s from './Filter.module.css'

export type FilterProps = {
  value: t.Filter;
  onChange: (value: t.Filter) => void;
  autoComplete?: (monaco: Monaco) => void,
};

const defaultJsValue = `(val, msg, agg) => {
  return true;
}`;

const Filter: React.FC<FilterProps> = (props) => {

  useEffect(() => {
    if (props.value.value !== undefined) {
      return
    }
    props.onChange({ ...props.value, value: defaultJsValue });
  }, []);

  return (
    <div className={s.Filter}>
      <div className={s.FormControl}>
        <CodeEditor
          value={props.value.value}
          onChange={v => props.onChange({ ...props.value, value: v || '' })}
          height="180rem"
          language="javascript"
          autoComplete={props.autoComplete}
        />
      </div>
    </div>
  );
}

export default Filter;
