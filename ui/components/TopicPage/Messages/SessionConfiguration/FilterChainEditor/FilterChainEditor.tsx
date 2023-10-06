import React from 'react';
import { v4 as uuid } from 'uuid';
import SmallButton from '../../../../ui/SmallButton/SmallButton';
import Select from '../../../../ui/Select/Select';
import * as t from '../../types';
import { UserManagedItemMetadata, UserManagedMessageFilter, UserManagedMessageFilterChain, UserManagedMessageFilterChainSpec, UserManagedMessageFilterChainValueOrReference } from '../../../../ui/LibraryBrowser/model/user-managed-items';
import FilterEditor from './FilterEditor/FilterEditor';
import createIcon from './icons/create.svg';

import s from './FilterChainEditor.module.css';
import LibraryBrowserPanel from '../../../../ui/LibraryBrowser/LibraryBrowserPanel/LibraryBrowserPanel';
import { useHover } from '../../../../app/hooks/use-hover';
import useLocalStorage from "use-local-storage-state";
import { localStorageKeys } from '../../../../local-storage-keys';
import { defaultJsFilterValue } from './FilterEditor/JsFilterEditor/JsFilterEditor';
import NothingToShow from '../../../../ui/NothingToShow/NothingToShow';
import Toggle from '../../../../ui/Toggle/Toggle';
import { UseUserManagedItemValOrRefSpinner, useResolveUserManagedItemValOrRef } from '../../../../ui/LibraryBrowser/useResolveUserManagedItemValOrRef';
import { LibraryContext } from '../../../../ui/LibraryBrowser/model/library-context';

export type FilterChainProps = {
  value: UserManagedMessageFilterChainValueOrReference;
  onChange: (value: UserManagedMessageFilterChainValueOrReference) => void;
  libraryContext: LibraryContext;
};

const FilterChain: React.FC<FilterChainProps> = (props) => {
  const [hoverRef, isHovered] = useHover();
  const [defaultMessageFilterType, _] = useLocalStorage<t.MessageFilterType>(localStorageKeys.defaultMessageFilterType, {
    defaultValue: 'basic-message-filter',
  });
  const resolveResult = useResolveUserManagedItemValOrRef<UserManagedMessageFilterChain>(props.value);

  if (resolveResult.type !== 'success') {
    return <UseUserManagedItemValOrRefSpinner item={props.value} result={resolveResult} />
  }

  const item = resolveResult.value;
  const itemSpec = item.spec;

  const onSpecChange = (spec: UserManagedMessageFilterChainSpec) => {
    const newValue: UserManagedMessageFilterChainValueOrReference = { ...props.value, value: { ...item, spec } };
    props.onChange(newValue);
  };

  const onConvertToValue = () => {
    const newValue: UserManagedMessageFilterChainValueOrReference = { type: 'value', value: item };
    props.onChange(newValue);
  };

  return (
    <div className={s.FilterChainEditor}>
      <div ref={hoverRef}>
        <LibraryBrowserPanel
          itemType='message-filter-chain'
          itemToSave={item}
          onPick={(item) => props.onChange({
            type: 'reference',
            reference: item.metadata.id,
            value: item as UserManagedMessageFilterChain
          })}
          onSave={(item) => props.onChange({
            type: 'reference',
            reference: item.metadata.id,
            value: item as UserManagedMessageFilterChain
          })}
          isForceShowButtons={isHovered}
          libraryContext={props.libraryContext}
          managedItemReference={props.value.type === 'reference' ? { id: props.value.reference, onConvertToValue } : undefined}
        />
        <div style={{ marginBottom: '12rem', display: 'flex', alignItems: 'center', gap: '8rem' }}>
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
          <Select<'all' | 'any'>
            list={[
              { type: 'item', title: 'All filters should match', value: 'all' },
              { type: 'item', title: 'At least one filter should match', value: 'any' },
            ]}
            value={itemSpec.mode}
            onChange={v => onSpecChange({ ...itemSpec, mode: v })}
          />
        </div>
      </div>

      {itemSpec.filters.length === 0 && (
        <div style={{ marginBottom: '12rem' }}>
          <NothingToShow content={<div>Click the button below to add a first filter.</div>} />
        </div>
      )}

      {itemSpec.filters.length !== 0 && itemSpec.filters.map((filter) => {
        const filterId = filter.type === 'reference' ? filter.reference : filter.value.metadata.id;
        return (
          <div key={filterId} className={s.Entry}>
            <div className={s.EntryFilter}>
              <FilterEditor
                value={filter}
                onChange={(updatedFilter) => {
                  const newFilters = itemSpec.filters.map((f) => {
                    const fId = f.type === 'reference' ? f.reference : f.value.metadata.id;
                    if (fId === filterId) {
                      return updatedFilter;
                    }
                    return f;
                  });
                  onSpecChange({ ...itemSpec, filters: newFilters });
                }}
                onDelete={() => {
                  const newFilters = itemSpec.filters.filter((f) => {
                    const fId = f.type === 'reference' ? f.reference : f.value.metadata.id;
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
        <SmallButton
          onClick={() => {
            const metadata: UserManagedItemMetadata = {
              id: uuid(),
              name: 'Unnamed',
              descriptionMarkdown: '',
              type: 'message-filter'
            };

            let newFilter: UserManagedMessageFilter;

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

            const newChain = itemSpec.filters.concat([{ type: 'value', value: newFilter }]);
            onSpecChange({ ...itemSpec, filters: newChain });
          }}
          text="Add Message Filter"
          type='primary'
          svgIcon={createIcon}
        />
      </div>
    </div>
  );
}

export default FilterChain;
