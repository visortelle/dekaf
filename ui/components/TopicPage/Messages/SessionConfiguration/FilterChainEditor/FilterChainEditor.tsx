import React, { useRef } from 'react';
import { v4 as uuid } from 'uuid';
import Select from '../../../../ui/Select/Select';
import * as t from '../../types';
import { ManagedItemMetadata, ManagedMessageFilter, ManagedMessageFilterChain, ManagedMessageFilterChainSpec, ManagedMessageFilterChainValOrRef, ManagedMessageFilterValOrRef } from '../../../../ui/LibraryBrowser/model/user-managed-items';
import FilterEditor from './FilterEditor/FilterEditor';

import s from './FilterChainEditor.module.css';
import LibraryBrowserPanel from '../../../../ui/LibraryBrowser/LibraryBrowserPanel/LibraryBrowserPanel';
import { useHover } from '../../../../app/hooks/use-hover';
import useLocalStorage from "use-local-storage-state";
import { localStorageKeys } from '../../../../local-storage-keys';
import { defaultJsFilterValue } from './FilterEditor/JsFilterEditor/JsFilterEditor';
import Toggle from '../../../../ui/Toggle/Toggle';
import { UseManagedItemValueSpinner, useManagedItemValue } from '../../../../ui/LibraryBrowser/useManagedItemValue';
import { LibraryContext } from '../../../../ui/LibraryBrowser/model/library-context';
import ListInput from '../../../../ui/ConfigurationTable/ListInput/ListInput';
import { defaultBasicMessageFilter } from './FilterEditor/BasicFilterEditor/defaultBasicMessageFilter';
import OnOffToggle from '../../../../ui/IconToggle/OnOffToggle/OnOffToggle';
import InvertedToggle from '../../../../ui/IconToggle/InvertedToggle/InvertedToggle';

export type FilterChainEditorProps = {
  value: ManagedMessageFilterChainValOrRef;
  onChange: (value: ManagedMessageFilterChainValOrRef) => void;
  libraryContext: LibraryContext;
  appearance?: 'default' | 'compact';
};

const FilterChainEditor: React.FC<FilterChainEditorProps> = (props) => {
  const [hoverRef, isHovered] = useHover();
  const [defaultMessageFilterType, _] = useLocalStorage<t.MessageFilterType>(localStorageKeys.defaultMessageFilterType, {
    defaultValue: 'basic-message-filter',
  });
  const ref = useRef<HTMLDivElement>(null);

  const resolveResult = useManagedItemValue<ManagedMessageFilterChain>(props.value);

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
      <div ref={hoverRef}>
        <LibraryBrowserPanel
          itemType='message-filter-chain'
          itemToSave={item}
          onPick={(item) => props.onChange({
            type: 'reference',
            ref: item.metadata.id,
            val: item as ManagedMessageFilterChain
          })}
          onSave={(item) => props.onChange({
            type: 'reference',
            ref: item.metadata.id,
            val: item as ManagedMessageFilterChain
          })}
          isForceShowButtons={isHovered}
          libraryContext={props.libraryContext}
          managedItemReference={props.value.type === 'reference' ? { id: props.value.ref, onConvertToValue } : undefined}
        />
        <div
          style={{
            marginBottom: '12rem',
            display: 'flex',
            alignItems: props.appearance ? 'unset' : 'center',
            gap: '8rem',
            paddingTop: props.appearance === 'compact' ? '8rem' : '0',
            flexDirection: props.appearance === 'compact' ? 'column' : 'row',
          }}>
          <div style={{ display: 'flex', gap: '12rem', flexDirection: 'row', flex: '1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8rem' }}>
              <OnOffToggle
                value={itemSpec.isEnabled}
                onChange={v => onSpecChange({ ...itemSpec, isEnabled: v })}
              />
              <InvertedToggle
                value={itemSpec.isNegated}
                onChange={v => onSpecChange({ ...itemSpec, isNegated: v })}
                helpOverride="If enabled, then messages that matches the filter chain will be not passed and vice versa."
              />
            </div>
            <div style={{ flex: '0 1 180rem', display: 'flex', marginLeft: 'auto' }}>
              <Select<'all' | 'any'>
                list={[
                  { type: 'item', title: 'Every filter should match', value: 'all' },
                  { type: 'item', title: 'Some filter should match', value: 'any' },
                ]}
                value={itemSpec.mode}
                onChange={v => onSpecChange({ ...itemSpec, mode: v })}
              />
            </div>
          </div>
        </div>
      </div>

      <ListInput<ManagedMessageFilterValOrRef>
        getId={(item) => item.type === 'reference' ? item.ref : item.val.metadata.id}
        value={itemSpec.filters}
        onChange={(filters) => onSpecChange({ ...itemSpec, filters })}
        renderItem={(filter) => {
          const filterId = filter.type === 'reference' ? filter.ref : filter.val.metadata.id
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
                />
              </div>
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

          let newFilter: ManagedMessageFilter;

          switch (defaultMessageFilterType) {
            case 'basic-message-filter':
              newFilter = {
                metadata,
                spec: {
                  isEnabled: true,
                  isNegated: false,
                  type: 'basic-message-filter',
                  value: defaultBasicMessageFilter
                }
              };
              break;
            case 'js-message-filter':
              newFilter = {
                metadata,
                spec: {
                  isEnabled: true,
                  isNegated: false,
                  type: 'js-message-filter',
                  value: defaultJsFilterValue
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
      />
    </div>
  );
}

export default FilterChainEditor;
