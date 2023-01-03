import React, { useEffect } from 'react';

import CodeEditor, { AutoCompleteConfig } from '../../../../ui/CodeEditor/CodeEditor';
import * as t from './types';

import s from './Filter.module.css'

export type FilterProps = {
  value: t.Filter;
  onChange: (value: t.Filter) => void;
  autoCompleteConfig?: AutoCompleteConfig;
};

const defaultJsValue = `(val, msg, agg) => {
  return true;
}`;

const defaultDescription = 'description'

const Filter: React.FC<FilterProps> = (props) => {

  useEffect(() => {
    if (props.value.value !== undefined) {
      return
    }
    props.onChange({ ...props.value, value: defaultJsValue, description: defaultDescription });
  }, []);

  return (
    <div className={s.Filter}>
      <div className={s.FormControl}>
        <CodeEditor
          value={props.value.value}
          onChange={v => props.onChange({ ...props.value, value: v || '' })}
          height="180rem"
          language="javascript"
          autoCompleteConfig={props.autoCompleteConfig}
        />
      </div>
    </div>
  );
}

export default Filter;
