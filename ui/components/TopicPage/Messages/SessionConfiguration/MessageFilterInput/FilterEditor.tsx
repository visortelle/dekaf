import React from 'react';

import CodeEditor from '../../../../ui/CodeEditor/CodeEditor';
import * as autocomplete from './autocomplete';
import * as t from './types';

import s from './FilterEditor.module.css'

export type FilterProps = {
  value: t.MessageFilter;
  onChange: (value: t.MessageFilter) => void;
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
          // TODO remove the autocomplete configuration, when it will be possible to select\configure it directly in the codeEditor.
          autoCompleteConfig={props.autoCompleteConfig ? { language: 'javascript', match: /msg\./, dependencies: autocomplete.dependencies, kind: 'Function' } : undefined}
        />
      </div>
    </div>
  );
}

export default Filter;
