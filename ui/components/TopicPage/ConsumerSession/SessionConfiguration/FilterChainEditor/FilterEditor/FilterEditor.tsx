import React from 'react';
import s from './FilterEditor.module.css'
import * as t from '../../../types';
import JsFilterEditor, { defaultJsFilterValue } from './JsFilterEditor/JsFilterEditor';
import BasicFilterEditor from './BasicFilterEditor/BasicFilterEditor';
import LibraryBrowserPanel, { LibraryBrowserPanelProps } from '../../../../../ui/LibraryBrowser/LibraryBrowserPanel/LibraryBrowserPanel';
import { useHover } from '../../../../../app/hooks/use-hover';
import useLocalStorage from "use-local-storage-state";
import { localStorageKeys } from '../../../../../local-storage-keys';
import { ManagedMessageFilter, ManagedMessageFilterSpec, ManagedMessageFilterValOrRef } from '../../../../../ui/LibraryBrowser/model/user-managed-items';
import { UseManagedItemValueSpinner, useManagedItemValue } from '../../../../../ui/LibraryBrowser/useManagedItemValue';
import { LibraryContext } from '../../../../../ui/LibraryBrowser/model/library-context';
import { defaultBasicMessageFilter } from './BasicFilterEditor/defaultBasicMessageFilter';
import OnOffToggle from '../../../../../ui/IconToggle/OnOffToggle/OnOffToggle';
import InvertedToggle from '../../../../../ui/IconToggle/InvertedToggle/InvertedToggle';
import IconToggle from '../../../../../ui/IconToggle/IconToggle';

export type FilterEditorProps = {
  value: ManagedMessageFilterValOrRef;
  onChange: (value: ManagedMessageFilterValOrRef) => void;
  libraryContext: LibraryContext;
  isReadOnly?: boolean;
  libraryBrowserPanel?: Partial<LibraryBrowserPanelProps>
};

const FilterEditor: React.FC<FilterEditorProps> = (props) => {
  const [hoverRef, isHovered] = useHover();
  const [_, setDefaultMessageFilterType] = useLocalStorage<t.MessageFilterType>(localStorageKeys.defaultMessageFilterType, {
    defaultValue: 'basic-message-filter',
  });

  const resolveResult = useManagedItemValue<ManagedMessageFilter>(props.value);
  if (resolveResult.type !== 'success') {
    return <UseManagedItemValueSpinner item={props.value} result={resolveResult} />
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

  const cssFilter = itemSpec.isEnabled ? undefined : 'grayscale(0.5) opacity(0.75)';

  return (
    <div className={s.FilterEditor} ref={hoverRef} style={{ filter: cssFilter }}>
      <div style={{ marginBottom: '8rem' }}>
        <LibraryBrowserPanel
          isReadOnly={props.isReadOnly}
          value={item}
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
          onChange={(item) => {
            props.onChange({
              ...props.value,
              val: item as ManagedMessageFilter
            });
          }}
          isForceShowButtons={isHovered}
          libraryContext={props.libraryContext}
          managedItemReference={props.value.type === 'reference' ? { id: props.value.ref, onConvertToValue } : undefined}
          extraElements={{
            preItemType: (
              <div style={{ display: 'flex', gap: '4rem' }}>
                <OnOffToggle
                  value={itemSpec.isEnabled}
                  onChange={() => onSpecChange({ ...itemSpec, isEnabled: !itemSpec.isEnabled })}
                  isReadOnly={props.isReadOnly}
                />

                <InvertedToggle
                  value={itemSpec.isNegated}
                  onChange={() => onSpecChange({ ...itemSpec, isNegated: !itemSpec.isNegated })}
                  helpOverride="Invert result. If enabled, then messages that matches the filter will be not passed and vice versa."
                  isReadOnly={props.isReadOnly}
                />
              </div>
            ),
            postItemType: (
              <div>
                <IconToggle<t.MessageFilterType>
                  items={[
                    {
                      type: 'item',
                      label: 'Basic',
                      value: 'basic-message-filter',
                      help: (
                        <>
                          Basic filters allow to define message filters without writing any code.
                          <br />
                          <br />
                          Click to switch to JavaScript filter.
                        </>
                      )
                    },
                    {
                      type: 'item',
                      label: 'JavaScript',
                      value: 'js-message-filter',
                      help: (
                        <>
                          JavaScript filters allow to define filters for complex scenarios.
                          <br />
                          <br />
                          Click to switch to Basic filter.
                        </>
                      )
                    },
                  ]}
                  value={itemSpec.type}
                  onChange={v => {
                    setDefaultMessageFilterType(v);

                    switch (v) {
                      case 'basic-message-filter':
                        onSpecChange({
                          ...itemSpec,
                          type: 'basic-message-filter',
                          value: defaultBasicMessageFilter,
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
                  isReadOnly={props.isReadOnly}
                />
              </div>
            )
          }}
          {...props.libraryBrowserPanel}
        />
      </div>

      <div>
        {itemSpec.type === 'basic-message-filter' && (
          <BasicFilterEditor
            value={itemSpec.value}
            onChange={(v) => onSpecChange({
              type: 'basic-message-filter',
              value: v,
              isEnabled: itemSpec.isEnabled,
              isNegated: itemSpec.isNegated,
            })}
            isReadOnly={props.isReadOnly}
          />
        )}
        {itemSpec.type === 'js-message-filter' && (
          <JsFilterEditor
            value={itemSpec.value}
            onChange={(v) => onSpecChange({
              type: 'js-message-filter',
              value: v,
              isEnabled: itemSpec.isEnabled,
              isNegated: itemSpec.isNegated,
            })}
            isReadOnly={props.isReadOnly}
          />
        )}
      </div>
    </div>
  );
}

export default FilterEditor;
