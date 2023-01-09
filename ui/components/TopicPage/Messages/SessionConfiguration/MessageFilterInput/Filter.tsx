import React, { useEffect } from 'react';

import { EditorFilter } from './FiltersEditor/FiltersEditor';
import CodeEditor from '../../../../ui/CodeEditor/CodeEditor';
import dependencies from './dependecies';

import s from './Filter.module.css'

export type FilterProps = {
  value: EditorFilter;
  onChange: (value: EditorFilter) => void;
  autoCompleteConfig?: boolean;
};

export const defaultJsValue = `({ value, accum }) => {
  return true
}`;

const Filter: React.FC<FilterProps> = (props) => {

  return (
    <div className={s.Filter}>
      <div className={s.FormControl}>
        <CodeEditor
          value={props.value.value}
          onChange={v => props.onChange({ ...props.value, value: v || '' })}
          height="180rem"
          language="javascript"
          //TODO DELETE WHEN AVAILABLE
          autoCompleteConfig={props.autoCompleteConfig ? { language: 'javascript', match: /msg\./, dependencies: dependencies, kind: 'Function' } : undefined}
        />
      </div>
    </div>
  );
}

export default Filter;
