import React, { useEffect } from 'react';

import CodeEditor, { AutoCompleteConfig } from '../../../../ui/CodeEditor/CodeEditor';

import s from './Filter.module.css'

export type FilterProps = {
  value: string;
  onChange: (value: string) => void;
  autoCompleteConfig?: AutoCompleteConfig;
};

export const defaultJsValue = `(val, msg, agg) => {
  return true;
}`;

const Filter: React.FC<FilterProps> = (props) => {

  useEffect(() => {
    if (props.value) {
      return
    }

    props.onChange(defaultJsValue);
  }, []);

  return (
    <div className={s.Filter}>
      <div className={s.FormControl}>
        <CodeEditor
          value={props.value}
          onChange={v => props.onChange(v || '')}
          height="180rem"
          language="javascript"
          autoCompleteConfig={props.autoCompleteConfig}
        />
      </div>
    </div>
  );
}

export default Filter;
