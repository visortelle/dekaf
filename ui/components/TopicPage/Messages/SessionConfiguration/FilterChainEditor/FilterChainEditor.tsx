import React, { useRef } from 'react';
import { v4 as uuid } from 'uuid';
import Select from '../../../../ui/Select/Select';
import * as t from '../../types';
import { ManagedItemMetadata, ManagedMessageFilter, ManagedMessageFilterChain, ManagedMessageFilterChainSpec, ManagedMessageFilterChainValOrRef } from '../../../../ui/LibraryBrowser/model/user-managed-items';
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
import AddButton from '../../../../ui/AddButton/AddButton';

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
              <Toggle
                label="Enabled"
                value={itemSpec.isEnabled}
                onChange={v => onSpecChange({ ...itemSpec, isEnabled: v })}
                help="The whole filter chain will be disabled if this toggle is off."
              />
              <Toggle
                label="Negated"
                value={itemSpec.isNegated}
                onChange={v => onSpecChange({ ...itemSpec, isNegated: v })}
                help="This filter chain results will be reversed. Filtered messages will be passed and vice versa."
              />
            </div>
            <div style={{ flex: '1', display: 'flex' }}>
              <Select<'all' | 'any'>
                list={[
                  { type: 'item', title: 'All filters should match', value: 'all' },
                  { type: 'item', title: 'Any filter should match', value: 'any' },
                ]}
                value={itemSpec.mode}
                onChange={v => onSpecChange({ ...itemSpec, mode: v })}
              />
            </div>
          </div>
        </div>
      </div>

      {itemSpec.filters.length !== 0 && itemSpec.filters.map((filter) => {
        const filterId = filter.type === 'reference' ? filter.ref : filter.val.metadata.id;
        return (
          <div key={filterId} className={s.Entry}>
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
                onDelete={() => {
                  const newFilters = itemSpec.filters.filter((f) => {
                    const fId = f.type === 'reference' ? f.ref : f.val.metadata.id;
                    return fId !== filterId;
                  });
                  onSpecChange({ ...itemSpec, filters: newFilters });
                }}
                libraryContext={props.libraryContext}
              />
            </div>
          </div>
        );
      })}

      <div className={`${s.Buttons}`}>
        <AddButton
          onClick={() => {
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
                    value: {}
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
          itemName="Message Filter"
        />
      </div>
    </div>
  );
}

export default FilterChainEditor;
