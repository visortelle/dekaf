import React, { useEffect } from 'react';
import s from './Filter.module.css'
import * as t from './types';
import Select from '../../../../ui/Select/Select';
import CodeEditor from '../../../../ui/CodeEditor/CodeEditor';

export type FilterProps = {
  value: t.Filter;
  onChange: (value: t.Filter) => void;
};

const defaultJsValue = `(val, msg, acc) => {
  return val !== undefined;
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
      {/* <div className={s.FormControl}>
        <Select<t.FilterLanguage>
          list={[
            { type: 'item', title: 'JavaScript', value: 'js' },
            { type: 'item', title: 'Python', value: 'python' },
          ]}
          onChange={v => props.onChange({
            ...props.value,
            language: v,
            value: getDefaultValue(v),
          })}
          value={props.value.language}
        />
      </div> */}

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
