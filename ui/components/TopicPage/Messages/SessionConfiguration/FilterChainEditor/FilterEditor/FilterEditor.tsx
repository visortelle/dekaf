import React from 'react';
import s from './FilterEditor.module.css'
import * as t from '../../../types';
import JsFilterEditor, { defaultJsFilterCode } from './JsFilterEditor/JsFilterEditor';
import BasicFilterEditor from './BasicFilterEditor/BasicFilterEditor';
import { MessageFilter } from '../../../types';
import Select from '../../../../../ui/Select/Select';
import FormItem from '../../../../../ui/ConfigurationTable/FormItem/FormItem';

type MessageFilterType = MessageFilter['type'];

export type FilterEditorProps = {
  value: t.MessageFilter;
  onChange: (value: t.MessageFilter) => void;
};

const FilterEditor: React.FC<FilterEditorProps> = (props) => {
  return (
    <div className={s.FilterEditor}>
      <FormItem>
        <Select<MessageFilterType>
          list={[
            { type: 'item', title: 'Basic Filter', value: 'basic-message-filter' },
            { type: 'item', title: 'JavaScript Filter', value: 'js-message-filter' },
          ]}
          value={props.value.type}
          onChange={v => {
            switch (v) {
              case 'basic-message-filter':
                props.onChange({
                  type: 'basic-message-filter',
                  value: {},
                  isEnabled: true,
                  isNegated: false,
                });
                return;
              case 'js-message-filter':
                props.onChange({
                  type: 'js-message-filter',
                  value: { jsCode: defaultJsFilterCode },
                  isEnabled: true,
                  isNegated: false,
                });
                return;
            }
          }}
        />
      </FormItem>
      <div>
        {props.value.type === 'basic-message-filter' && (
          <BasicFilterEditor />
        )}
        {props.value.type === 'js-message-filter' && (
          <JsFilterEditor
            value={props.value.value}
            onChange={v => props.onChange({
              type: 'js-message-filter',
              value: v,
              isEnabled: true,
              isNegated: false,
            })}
          />
        )}
      </div>
    </div>
  );
}

export default FilterEditor;
