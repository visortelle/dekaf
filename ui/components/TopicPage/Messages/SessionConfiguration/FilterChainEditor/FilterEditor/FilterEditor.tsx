import React from 'react';
import s from './FilterEditor.module.css'
import * as t from '../../../types';
import JsFilterEditor, { defaultJsFilterValue } from './JsFilterEditor/JsFilterEditor';
import BasicFilterEditor from './BasicFilterEditor/BasicFilterEditor';
import Select from '../../../../../ui/Select/Select';
import FormItem from '../../../../../ui/ConfigurationTable/FormItem/FormItem';
import Toggle from '../../../../../ui/Toggle/Toggle';
import SmallButton from '../../../../../ui/SmallButton/SmallButton';
import deleteIcon from '../icons/delete.svg';
import LibraryBrowserPanel from '../../../../../ui/LibraryBrowser/LibraryBrowserPanel/LibraryBrowserPanel';
import { useHover } from '../../../../../app/hooks/use-hover';
import useLocalStorage from "use-local-storage-state";
import { localStorageKeys } from '../../../../../local-storage-keys';

export type FilterEditorProps = {
  value: t.MessageFilter;
  onChange: (value: t.MessageFilter) => void;
  onDelete?: () => void;
};

const FilterEditor: React.FC<FilterEditorProps> = (props) => {
  const [hoverRef, isHovered] = useHover();
  const [_, setDefaultMessageFilterType] = useLocalStorage<t.MessageFilterType>(localStorageKeys.defaultMessageFilterType, {
    defaultValue: 'basic-message-filter',
  });

  return (
    <div className={s.FilterEditor} ref={hoverRef}>
      <LibraryBrowserPanel
        itemDescriptorToSave={{ type: 'message-filter', value: props.value }}
        itemType='message-filter'
        onPick={(item) => {
          if (item.descriptor.type !== 'message-filter') {
            return;
          }

          props.onChange(item.descriptor.value);
        }}
        isForceShowButtons={isHovered}
      />
      <FormItem>
        <div className={s.Controls}>
          <Toggle
            value={props.value.isEnabled}
            onChange={() => props.onChange({ ...props.value, isEnabled: !props.value.isEnabled })}
            label='Enabled'
            help="This filter will be disabled if this toggle is off."
          />

          <Toggle
            value={props.value.isNegated}
            onChange={() => props.onChange({ ...props.value, isNegated: !props.value.isNegated })}
            help='This filter results will be reversed. Filtered messages will be passed and vice versa.'
            label='Negated'
          />

          <Select<t.MessageFilterType>
            list={[
              { type: 'item', title: 'Basic Filter', value: 'basic-message-filter' },
              { type: 'item', title: 'JS Filter', value: 'js-message-filter' },
            ]}
            value={props.value.type}
            onChange={v => {
              setDefaultMessageFilterType(v);

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
                    value: defaultJsFilterValue,
                    isEnabled: true,
                    isNegated: false,
                  });
                  return;
              }
            }}
          />

          {props.onDelete && (
            <SmallButton
              onClick={props.onDelete}
              type='danger'
              svgIcon={deleteIcon}
              title='Delete this filter'
            />
          )}
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
