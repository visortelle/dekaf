import React from 'react';
import s from './FilterEditor.module.css'
import * as t from '../../../types';
import JsFilterEditor from './JsFilterEditor/JsFilterEditor';
import BasicFilterEditor from './BasicFilterEditor/BasicFilterEditor';

export type FilterEditorProps = {
  value: t.MessageFilter;
  onChange: (value: t.MessageFilter) => void;
};

const FilterEditor: React.FC<FilterEditorProps> = (props) => {
  return (
    <div className={s.FilterEditor}>
      {props.value.type === 'basic-message-filter' && (
        <BasicFilterEditor />
      )}
      {props.value.type === 'js-message-filter' && (
        <JsFilterEditor
          value={props.value.value}
          onChange={v => props.onChange({ type: 'js-message-filter', value: v })}
        />
      )}
    </div>
  );
}

export default FilterEditor;
