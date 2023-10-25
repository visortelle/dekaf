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
import { UseUserManagedItemValueSpinner, useUserManagedItemValue } from '../../../../../ui/LibraryBrowser/useUserManagedItemValue';
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
    defaultValue: 'basic-message-filter-contains',
  });

  const resolveResult = useUserManagedItemValue<UserManagedMessageFilter>(props.value);
  if (resolveResult.type !== 'success') {
    return <UseUserManagedItemValueSpinner item={props.value} result={resolveResult} onDelete={props.onDelete} />
  }

  const item = resolveResult.value;
  const itemSpec = item.spec;

  const onSpecChange = (spec: UserManagedMessageFilterSpec) => {
    const newValue: UserManagedMessageFilterValueOrReference = { ...props.value, value: { ...item, spec } };
    props.onChange(newValue);
  };

  const onConvertToValue = () => {
    const newValue: UserManagedMessageFilterValueOrReference = { type: 'value', value: item };
    props.onChange(newValue);
  };

  return (
    <div className={s.FilterEditor} ref={hoverRef}>
      <LibraryBrowserPanel
        itemToSave={item}
        itemType='message-filter'
        onPick={(item) => props.onChange({
          type: 'reference',
          reference: item.metadata.id,
          value: item as UserManagedMessageFilter
        })}
        onSave={(item) => props.onChange({
          type: 'reference',
          reference: item.metadata.id,
          value: item as UserManagedMessageFilter
        })}
        isForceShowButtons={isHovered}
        libraryContext={props.libraryContext}
        managedItemReference={props.value.type === 'reference' ? { id: props.value.reference, onConvertToValue } : undefined}
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
              { type: 'item', title: 'JS Filter', value: 'js-message-filter' },
              {
                type: 'group', title: 'Basic Filter', items: [
                  { type: 'item', title: 'Contains', value: 'basic-message-filter-contains' },
                  { type: 'item', title: 'Ends With', value: 'basic-message-filter-end-with' },
                  { type: 'item', title: 'Equals', value: 'basic-message-filter-equals' },
                  { type: 'item', title: 'Greater Than', value: 'basic-message-filter-greater-than' },
                  { type: 'item', title: 'Greater Than Or Equal', value: 'basic-message-filter-greater-than-or-equals' },
                  { type: 'item', title: 'Is Null', value: 'basic-message-filter-is-null' },
                  { type: 'item', title: 'Is Truthy', value: 'basic-message-filter-is-truthy' },
                  { type: 'item', title: 'Less Than', value: 'basic-message-filter-less-than' },
                  { type: 'item', title: 'Less Than Or Equal', value: 'basic-message-filter-less-than-or-equals' },
                  { type: 'item', title: 'Regex', value: 'basic-message-filter-regex' },
                  { type: 'item', title: 'Starts With', value: 'basic-message-filter-starts-with' },
                ]
              }
            ]}
            value={itemSpec.type}
            onChange={v => {
              setDefaultMessageFilterType(v);

              switch (v) {
                case 'basic-message-filter-contains':
                  onSpecChange({
                    ...itemSpec,
                    type: 'basic-message-filter-contains',
                    value: {
                      value: '',
                      target: 'value',
                      isCaseSensitive: false,
                    }
                  });
                  return;
                case 'basic-message-filter-end-with':
                  onSpecChange({
                    ...itemSpec,
                    type: 'basic-message-filter-end-with',
                    value: {
                      value: '',
                      target: 'value',
                      isCaseSensitive: false,
                    }
                  });
                  return;
                case 'basic-message-filter-equals':
                  onSpecChange({
                    ...itemSpec,
                    type: 'basic-message-filter-equals',
                    value: {
                      value: '',
                      target: 'value',
                      isCaseSensitive: false,
                    }
                  });
                  return;
                case 'basic-message-filter-greater-than':
                  onSpecChange({
                    ...itemSpec,
                    type: 'basic-message-filter-greater-than',
                    value: {
                      value: '',
                      target: 'value',
                    }
                  });
                  return;
                case 'basic-message-filter-greater-than-or-equals':
                  onSpecChange({
                    ...itemSpec,
                    type: 'basic-message-filter-greater-than-or-equals',
                    value: {
                      value: '',
                      target: 'value',
                    }
                  });
                  return;
                case 'basic-message-filter-is-null':
                  onSpecChange({
                    ...itemSpec,
                    type: 'basic-message-filter-is-null',
                    value: {
                      target: 'value',
                    }
                  });
                  return;
                case 'basic-message-filter-is-truthy':
                  onSpecChange({
                    ...itemSpec,
                    type: 'basic-message-filter-is-truthy',
                    value: {
                      target: 'value',
                    }
                  });
                  return;
                case 'basic-message-filter-less-than':
                  onSpecChange({
                    ...itemSpec,
                    type: 'basic-message-filter-less-than',
                    value: {
                      value: '',
                      target: 'value',
                    }
                  });
                  return;
                case 'basic-message-filter-less-than-or-equals':
                  onSpecChange({
                    ...itemSpec,
                    type: 'basic-message-filter-less-than-or-equals',
                    value: {
                      value: '',
                      target: 'value',
                    }
                  });
                  return;
                case 'basic-message-filter-regex':
                  onSpecChange({
                    ...itemSpec,
                    type: 'basic-message-filter-regex',
                    value: {
                      value: '',
                      target: 'value',
                    }
                  });
                  return;
                case 'basic-message-filter-starts-with':
                  onSpecChange({
                    ...itemSpec,
                    type: 'basic-message-filter-starts-with',
                    value: {
                      value: '',
                      target: 'value',
                      isCaseSensitive: false,
                    }
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
        {itemSpec.type === 'js-message-filter' ? (
          <JsFilterEditor
            value={itemSpec.value}
            onChange={(v) => onSpecChange({
              type: 'js-message-filter',
              value: v,
              isEnabled: true,
              isNegated: false,
            })}
          />
        ) : (
          <BasicFilterEditor
            filterValue={itemSpec.value}
            onChange={(filterValue) => onSpecChange({
              type: itemSpec.type,
              value: {
                value: filterValue.value!,
                target: filterValue.target,
                isCaseSensitive: filterValue.isCaseSensitive!,
              },
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
