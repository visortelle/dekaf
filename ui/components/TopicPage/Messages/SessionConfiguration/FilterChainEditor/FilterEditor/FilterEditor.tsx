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
import { UseUserManagedItemValOrRefSpinner, useResolveUserManagedItemValOrRef } from '../../../../../ui/LibraryBrowser/useResolveUserManagedItemValOrRef';
import { LibraryContext } from '../../../../../ui/LibraryBrowser/model/library-context';

export type FilterEditorProps = {
  value: UserManagedMessageFilterValueOrReference;
  onChange: (value: UserManagedMessageFilterValueOrReference) => void;
  onDelete?: () => void;
  libraryContext: LibraryContext;
};

const FilterEditor: React.FC<FilterEditorProps> = (props) => {
  const [hoverRef, isHovered] = useHover();
  const [_, setDefaultMessageFilterType] = useLocalStorage<t.MessageFilterType>(localStorageKeys.defaultMessageFilterType, {
    defaultValue: 'basic-message-filter',
  });

  const resolveResult = useResolveUserManagedItemValOrRef<UserManagedMessageFilter>(props.value);
  if (resolveResult.type !== 'success') {
    return <UseUserManagedItemValOrRefSpinner item={props.value} result={resolveResult} />
  }

  const value = resolveResult.value;
  const spec = value.spec;

  console.log('props.value', props.value);
  console.log('value', value);
  console.log('spec', spec);

  const onSpecChange = (spec: UserManagedMessageFilterSpec) => {
    const newValue: UserManagedMessageFilterValueOrReference = { ...props.value, value: { ...value, spec } };
    props.onChange(newValue);
  };

  return (
    <div className={s.FilterEditor} ref={hoverRef}>
      <LibraryBrowserPanel
        itemToSave={value}
        itemType='message-filter'
        onPick={(item) => props.onChange({
          type: 'reference',
          reference: item.metadata.id,
          value: item as UserManagedMessageFilter
        })}
        isForceShowButtons={isHovered}
        libraryContext={props.libraryContext}
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
            value={spec.type}
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
