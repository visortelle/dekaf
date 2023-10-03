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
import { UserManagedMessageFilter, UserManagedMessageFilterSpec, UserManagedMessageFilterValueOrReference } from '../../../../../ui/LibraryBrowser/model/user-managed-items';
import { useResolvedUserManagedItemValueOrReference } from '../../../../../ui/LibraryBrowser/use-resolved-user-managed-item-value-or-reference';
import NothingToShow from '../../../../../ui/NothingToShow/NothingToShow';

export type FilterEditorProps = {
  value: UserManagedMessageFilterValueOrReference;
  onChange: (value: UserManagedMessageFilterValueOrReference) => void;
  onDelete?: () => void;
};

const FilterEditor: React.FC<FilterEditorProps> = (props) => {
  const [hoverRef, isHovered] = useHover();
  const [_, setDefaultMessageFilterType] = useLocalStorage<t.MessageFilterType>(localStorageKeys.defaultMessageFilterType, {
    defaultValue: 'basic-message-filter',
  });

  const value = useResolvedUserManagedItemValueOrReference<UserManagedMessageFilter>(props.value);

  if (value === undefined) {
    if (props.value.type === 'reference') {
      return (
        <NothingToShow
          reason='error'
          content={(
            <div>
              Unable to resolve Message Filter by reference.
              <br /><br />
              Probably it was deleted. Ensure that the Message Filter with id <strong>{props.value.reference}</strong> exists in the Library and try again.
            </div>
          )}
        />
      );
    }

    return null;
  }

  const spec = value.spec;

  const onSpecChange = (spec: UserManagedMessageFilterSpec) => {
    if (props.value.type === 'value') {
      const newValue: UserManagedMessageFilterValueOrReference = { ...props.value, value: { ...props.value.value, spec } };
      props.onChange(newValue);
      return;
    }

    if (props.value.type === 'reference' && props.value.localValue !== undefined) {
      const newValue: UserManagedMessageFilterValueOrReference = { ...props.value, localValue: { ...props.value.localValue, spec } };
      props.onChange(newValue);
      return;
    }
  };

  return (
    <div className={s.FilterEditor} ref={hoverRef}>
      <LibraryBrowserPanel
        itemToSave={value}
        itemType='message-filter'
        onPick={(item) => {
          if (item.metadata.type !== 'message-filter-chain') {
            return;
          }

          props.onChange({ type: 'reference', reference: item.metadata.id })
        }}
        isForceShowButtons={isHovered}
      />
      <FormItem>
        <div className={s.Controls}>
          <Toggle
            value={spec.isEnabled}
            onChange={() => onSpecChange({ ...spec, isEnabled: !spec.isEnabled })}
            label='Enabled'
            help="This filter will be disabled if this toggle is off."
          />

          <Toggle
            value={spec.isNegated}
            onChange={() => onSpecChange({ ...spec, isNegated: !spec.isNegated })}
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
                  onSpecChange({
                    ...spec,
                    type: 'basic-message-filter',
                    value: {},
                  });
                  return;
                case 'js-message-filter':
                  onSpecChange({
                    ...spec,
                    type: 'js-message-filter',
                    value: defaultJsFilterValue,
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
        {spec.type === 'basic-message-filter' && (
          <BasicFilterEditor />
        )}
        {spec.type === 'js-message-filter' && (
          <JsFilterEditor
            value={spec.value}
            onChange={(v) => onSpecChange({
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
