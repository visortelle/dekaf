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
import { ManagedMessageFilter, ManagedMessageFilterSpec, ManagedMessageFilterValOrRef } from '../../../../../ui/LibraryBrowser/model/user-managed-items';
import { UseManagedItemValueSpinner, useManagedItemValue } from '../../../../../ui/LibraryBrowser/useManagedItemValue';
import { LibraryContext } from '../../../../../ui/LibraryBrowser/model/library-context';

export type FilterEditorProps = {
  value: ManagedMessageFilterValOrRef;
  onChange: (value: ManagedMessageFilterValOrRef) => void;
  onDelete?: () => void;
  libraryContext: LibraryContext;
};

const FilterEditor: React.FC<FilterEditorProps> = (props) => {
  const [hoverRef, isHovered] = useHover();
  const [_, setDefaultMessageFilterType] = useLocalStorage<t.MessageFilterType>(localStorageKeys.defaultMessageFilterType, {
    defaultValue: 'basic-message-filter',
  });

  const resolveResult = useManagedItemValue<ManagedMessageFilter>(props.value);
  if (resolveResult.type !== 'success') {
    return <UseManagedItemValueSpinner item={props.value} result={resolveResult} onDelete={props.onDelete} />
  }

  const item = resolveResult.value;
  const itemSpec = item.spec;

  const onSpecChange = (spec: ManagedMessageFilterSpec) => {
    const newValue: ManagedMessageFilterValOrRef = { ...props.value, val: { ...item, spec } };
    props.onChange(newValue);
  };

  const onConvertToValue = () => {
    const newValue: ManagedMessageFilterValOrRef = { type: 'value', val: item };
    props.onChange(newValue);
  };

  return (
    <div className={s.FilterEditor} ref={hoverRef}>
      <LibraryBrowserPanel
        itemToSave={item}
        itemType='message-filter'
        onPick={(item) => props.onChange({
          type: 'reference',
          ref: item.metadata.id,
          val: item as ManagedMessageFilter
        })}
        onSave={(item) => props.onChange({
          type: 'reference',
          ref: item.metadata.id,
          val: item as ManagedMessageFilter
        })}
        isForceShowButtons={isHovered}
        libraryContext={props.libraryContext}
        managedItemReference={props.value.type === 'reference' ? { id: props.value.ref, onConvertToValue } : undefined}
      />
      <FormItem>
        <div className={s.Controls}>
          <Toggle
            value={itemSpec.isEnabled}
            onChange={() => onSpecChange({ ...itemSpec, isEnabled: !itemSpec.isEnabled })}
            label='Enabled'
            help="This filter will be disabled if this toggle is off."
          />

          <Toggle
            value={itemSpec.isNegated}
            onChange={() => onSpecChange({ ...itemSpec, isNegated: !itemSpec.isNegated })}
            help='This filter results will be reversed. Filtered messages will be passed and vice versa.'
            label='Negated'
          />

          <Select<t.MessageFilterType>
            list={[
              { type: 'item', title: 'Basic Filter', value: 'basic-message-filter' },
              { type: 'item', title: 'JS Filter', value: 'js-message-filter' },
            ]}
            value={itemSpec.type}
            onChange={v => {
              setDefaultMessageFilterType(v);

              switch (v) {
                case 'basic-message-filter':
                  onSpecChange({
                    ...itemSpec,
                    type: 'basic-message-filter',
                    value: {},
                  });
                  return;
                case 'js-message-filter':
                  onSpecChange({
                    ...itemSpec,
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
        {itemSpec.type === 'basic-message-filter' && (
          <BasicFilterEditor />
        )}
        {itemSpec.type === 'js-message-filter' && (
          <JsFilterEditor
            value={itemSpec.value}
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
