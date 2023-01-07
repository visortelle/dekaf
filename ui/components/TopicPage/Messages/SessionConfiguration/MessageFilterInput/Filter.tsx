import React, { useEffect } from 'react';
import s from './Filter.module.css'
import * as t from './types';
import CodeEditor from '../../../../ui/CodeEditor/CodeEditor';

export type FilterProps = {
  value: t.Filter;
  onChange: (value: t.Filter) => void;
};

const defaultJsValue = `({ value, accum }) => {
    return true
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
        />
      </div>
    </div>
  );
}

export default Filter;
