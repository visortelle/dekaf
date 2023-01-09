import React, { useEffect } from 'react';

import CodeEditor from '../../../../ui/CodeEditor/CodeEditor';
import dependencies from './dependecies';

import s from './Filter.module.css'

export type FilterProps = {
  value: string;
  onChange: (value: string) => void;
  autoCompleteConfig?: boolean;
};

export const defaultJsValue = `({ value, accum }) => {
  return true
}`;

const Filter: React.FC<FilterProps> = (props) => {

  useEffect(() => {
    if (props.value) {
      return;
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
          autoCompleteConfig={props.autoCompleteConfig ? { language: 'javascript', match: /msg\./, dependencies: dependencies, kind: 'Function' } : undefined}
        />
      </div>
    </div>
  );
}

export default Filter;
