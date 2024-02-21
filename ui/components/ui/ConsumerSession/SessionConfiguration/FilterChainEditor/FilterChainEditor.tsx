import React, { useEffect, useRef } from 'react';
import { v4 as uuid } from 'uuid';
import * as t from '../../types';
import { ManagedBasicMessageFilterTargetValOrRef, ManagedItemMetadata, ManagedMessageFilter, ManagedMessageFilterChain, ManagedMessageFilterChainSpec, ManagedMessageFilterChainValOrRef, ManagedMessageFilterValOrRef } from '../../../LibraryBrowser/model/user-managed-items';
import FilterEditor from './FilterEditor/FilterEditor';

import s from './FilterChainEditor.module.css';
import LibraryBrowserPanel, { LibraryBrowserPanelProps } from '../../../LibraryBrowser/LibraryBrowserPanel/LibraryBrowserPanel';
import { useHover } from '../../../../app/hooks/use-hover';
import useLocalStorage from "use-local-storage-state";
import { localStorageKeys } from '../../../../local-storage-keys';
import { defaultJsFilterValue } from './FilterEditor/JsFilterEditor/JsFilterEditor';
import { UseManagedItemValueSpinner, useManagedItemValue } from '../../../LibraryBrowser/useManagedItemValue';
import { LibraryContext } from '../../../LibraryBrowser/model/library-context';
import ListInput from '../../../ConfigurationTable/ListInput/ListInput';
import { defaultBasicMessageFilter } from './FilterEditor/BasicFilterEditor/defaultBasicMessageFilter';
import OnOffToggle from '../../../IconToggle/OnOffToggle/OnOffToggle';
import InvertedToggle from '../../../IconToggle/InvertedToggle/InvertedToggle';
import IconToggle from '../../../IconToggle/IconToggle';
import { getDefaultManagedItemMetadata } from '../../../LibraryBrowser/default-library-items';

export type FilterChainEditorProps = {
  value: ManagedMessageFilterChainValOrRef;
  onChange: (value: ManagedMessageFilterChainValOrRef) => void;
  libraryContext: LibraryContext;
  isReadOnly?: boolean;
  libraryBrowserPanel?: Partial<LibraryBrowserPanelProps>
};

const FilterChainEditor: React.FC<FilterChainEditorProps> = (props) => {
  const [hoverRef, isHovered] = useHover();
  const [defaultMessageFilterType, _] = useLocalStorage<t.MessageFilterType>(localStorageKeys.defaultMessageFilterType, {
    defaultValue: 'BasicMessageFilter',
  });
  const ref = useRef<HTMLDivElement>(null);

  const resolveResult = useManagedItemValue<ManagedMessageFilterChain>(props.value);

  useEffect(() => {
    if (props.value.val === undefined && resolveResult.type === 'success') {
      props.onChange({ ...props.value, val: resolveResult.value });
    }
  }, [resolveResult]);

  if (resolveResult.type !== 'success') {
    return <UseManagedItemValueSpinner item={props.value} result={resolveResult} />
  }

  const item = resolveResult.value;
  const itemSpec = item.spec;

  const onSpecChange = (spec: ManagedMessageFilterChainSpec) => {
    const newValue: ManagedMessageFilterChainValOrRef = { ...props.value, val: { ...item, spec } };
    props.onChange(newValue);
  };

  const onConvertToValue = () => {
    const newValue: ManagedMessageFilterChainValOrRef = { type: 'value', val: item };
    props.onChange(newValue);
  };

  const cssFilter = itemSpec.isEnabled ? undefined : 'grayscale(0.5) opacity(0.75)';

  return (
    <div className={s.FilterChainEditor} ref={ref} style={{ filter: cssFilter }}>
      <div ref={hoverRef} style={{ marginBottom: '8rem' }}>
        <LibraryBrowserPanel
          itemType='message-filter-chain'
          value={item}
          onPick={(item) => props.onChange({
            type: 'value',
            val: item as ManagedMessageFilterChain
          })}
          onSave={(item) => props.onChange({
            type: 'value',
            val: item as ManagedMessageFilterChain
          })}
          onChange={(item) => {
            props.onChange({
              ...props.value,
              val: item as ManagedMessageFilterChain
            });
          }}
          isForceShowButtons={isHovered}
          libraryContext={props.libraryContext}
          managedItemReference={props.value.type === 'reference' ? { id: props.value.ref, onConvertToValue } : undefined}
          extraElements={{
            preItemType: (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4rem' }}>
                <OnOffToggle
                  value={itemSpec.isEnabled}
                  onChange={v => onSpecChange({ ...itemSpec, isEnabled: v })}
                  isReadOnly={props.isReadOnly}
                />
                <InvertedToggle
                  value={itemSpec.isNegated}
                  onChange={v => onSpecChange({ ...itemSpec, isNegated: v })}
                  helpOverride="Invert result. If enabled, then messages that matches the filter chain will be not passed and vice versa."
                  isReadOnly={props.isReadOnly}
                />
              </div>
            )
          }}
          isReadOnly={props.isReadOnly}
          {...props.libraryBrowserPanel}
        />
      </div>

      <ListInput<ManagedMessageFilterValOrRef>
        getId={(item) => item.type === 'reference' ? item.ref : item.val.metadata.id}
        value={itemSpec.filters}
        onChange={(filters) => onSpecChange({ ...itemSpec, filters })}
        renderItem={(filter, i) => {
          const filterId = filter.type === 'reference' ? filter.ref : filter.val.metadata.id
          const isLast = i === itemSpec.filters.length - 1;

          return (
            <div className={s.Entry}>
              <div className={s.EntryFilter}>
                <FilterEditor
                  value={filter}
                  onChange={(updatedFilter) => {
                    const newFilters = itemSpec.filters.map((f) => {
                      const fId = f.type === 'reference' ? f.ref : f.val.metadata.id;
                      if (fId === filterId) {
                        return updatedFilter;
                      }
                      return f;
                    });
                    onSpecChange({ ...itemSpec, filters: newFilters });
                  }}
                  libraryContext={props.libraryContext}
                  isReadOnly={props.isReadOnly}
                />
              </div>
              {!isLast && (
                <div className={s.ModeToggle}>
                  <IconToggle<'all' | 'any'>
                    items={[
                      { type: 'item', label: 'AND', help: 'Every filter should match.', value: 'all' },
                      { type: 'item', label: 'OR', help: 'Some filter should match.', value: 'any' },
                    ]}
                    value={itemSpec.mode}
                    onChange={v => onSpecChange({ ...itemSpec, mode: v })}
                    isReadOnly={props.isReadOnly}
                  />
                </div>
              )}
            </div>
          );
        }}
        onAdd={() => {
          const metadata: ManagedItemMetadata = {
            id: uuid(),
            name: '',
            descriptionMarkdown: '',
            type: 'message-filter'
          };

          const targetField: ManagedBasicMessageFilterTargetValOrRef = {
            type: "value",
            val: {
              metadata: getDefaultManagedItemMetadata("basic-message-filter-target"),
              spec: {
                target: {
                  type: "BasicMessageFilterTarget",
                  target: {
                    type: "BasicMessageFilterCurrentMessageValueTarget"
                  }
                }
              }
            }
          };

          let newFilter: ManagedMessageFilter;
          switch (defaultMessageFilterType) {
            case 'BasicMessageFilter':
              newFilter = {
                metadata,
                spec: {
                  isEnabled: true,
                  isNegated: false,
                  filter: defaultBasicMessageFilter,
                  targetField
                }
              };
              break;
            case 'JsMessageFilter':
              newFilter = {
                metadata,
                spec: {
                  isEnabled: true,
                  isNegated: false,
                  filter: defaultJsFilterValue,
                  targetField
                }
              }
              break;
          }

          const newChain = itemSpec.filters.concat([{ type: 'value', val: newFilter }]);
          onSpecChange({ ...itemSpec, filters: newChain });
        }}
        onRemove={(id) => {
          const newChain = itemSpec.filters.filter((f) => f.type === 'reference' ? f.ref !== id : f.val.metadata.id !== id);
          onSpecChange({ ...itemSpec, filters: newChain });
        }}
        itemName='Filter'
        isHideNothingToShow
        isContentDoesntOverlapRemoveButton
        isReadOnly={props.isReadOnly}
      />
    </div>
  );
}

export default FilterChainEditor;
