import React from 'react';
import s from './Filter.module.css'
import * as t from './types';
import Select from '../../../../ui/Select/Select';
import CodeEditor from '../../../../ui/CodeEditor/CodeEditor';

export type FilterProps = {
  value: t.Filter;
  onChange: (value: t.Filter) => void;
};

const defaultJsValue = `({ value, key, topic, redeliveryCount, schemaVersion, isReplicated, replicatedFrom }) => {
  return value.includes('a');
}`;

const Filter: React.FC<FilterProps> = (props) => {
  return (
    <div className={s.Filter}>
      <div className={s.FormControl}>
        <Select<t.FilterSyntax>
          list={[
            { type: 'item', title: 'JavaScript', value: 'js' },
            { type: 'item', title: 'Python', value: 'python' },
          ]}
          onChange={v => props.onChange({ ...props.value, syntax: v, value: v === 'js' ? defaultJsValue : '' })}
          value={props.value.syntax}
        />
      </div>

      <div className={s.FormControl}>
        <CodeEditor
          value={props.value.value}
          onChange={v => props.onChange({ ...props.value, value: v || '' })}
          height="180rem"
          language={props.value.syntax === 'js' ? 'javascript' : 'python'}
        />
      </div>
    </div>
  );
}

export default Filter;
