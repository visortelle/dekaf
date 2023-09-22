import React from 'react';
import s from './FilterEditor.module.css'
import * as t from '../../../types';
import JsFilterEditor, { defaultJsFilterCode } from './JsFilterEditor/JsFilterEditor';
import BasicFilterEditor from './BasicFilterEditor/BasicFilterEditor';
import { MessageFilter } from '../../../types';
import Select from '../../../../../ui/Select/Select';
import FormItem from '../../../../../ui/ConfigurationTable/FormItem/FormItem';
import Toggle from '../../../../../ui/Toggle/Toggle';
import SmallButton from '../../../../../ui/SmallButton/SmallButton';
import deleteIcon from '../icons/delete.svg';

type MessageFilterType = MessageFilter['type'];

export type FilterEditorProps = {
  value: t.MessageFilter;
  onChange: (value: t.MessageFilter) => void;
  onDelete: () => void;
};

const FilterEditor: React.FC<FilterEditorProps> = (props) => {
  return (
    <div className={s.FilterEditor}>
      <FormItem>
        <div className={s.Controls}>
          <Toggle
            value={props.value.isEnabled}
            onChange={() => props.onChange({ ...props.value, isEnabled: !props.value.isEnabled })}
            title='Toggle this filter'
            label='Enabled'
          />

          <Toggle
            value={props.value.isNegated}
            onChange={() => props.onChange({ ...props.value, isNegated: !props.value.isNegated })}
            title='Toggle negate this filter'
            label='Negated'
          />

          <Select<MessageFilterType>
            list={[
              { type: 'item', title: 'Basic Filter', value: 'basic-message-filter' },
              { type: 'item', title: 'JS Filter', value: 'js-message-filter' },
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

          <SmallButton
            onClick={() => { }}
            type='danger'
            svgIcon={deleteIcon}
            title='Delete this filter'
          />
        </div>
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
