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
import { UserManagedItemResolverSpinner, useResolvedUserManagedItem } from '../../../../ui/LibraryBrowser/use-resolved-user-managed-item';

export type FilterChainProps = {
  value: UserManagedMessageFilterChainValueOrReference;
  onChange: (value: UserManagedMessageFilterChainValueOrReference) => void;
};

const FilterChain: React.FC<FilterChainProps> = (props) => {
  const [hoverRef, isHovered] = useHover();
  const [defaultMessageFilterType, _] = useLocalStorage<t.MessageFilterType>(localStorageKeys.defaultMessageFilterType, {
    defaultValue: 'basic-message-filter',
  });
  const resolveResult = useResolvedUserManagedItem<UserManagedMessageFilterChain>(props.value);

  if (resolveResult.type !== 'success') {
    return <UserManagedItemResolverSpinner item={props.value} result={resolveResult} />
  }

  const value = resolveResult.value;
  const spec = value.spec;

  const onSpecChange = (spec: UserManagedMessageFilterChainSpec) => {
    if (props.value.type === 'value') {
      const newValue: UserManagedMessageFilterChainValueOrReference = { ...props.value, value: { ...props.value.value, spec } };
      props.onChange(newValue);
      return;
    }

    if (props.value.type === 'reference' && props.value.localValue !== undefined) {
      const newValue: UserManagedMessageFilterChainValueOrReference = { ...props.value, localValue: { ...props.value.localValue, spec } };
      props.onChange(newValue);
      return;
    }
  };

  return (
    <div className={s.FilterChainEditor}>
      <div ref={hoverRef}>
        <LibraryBrowserPanel
          itemType='message-filter-chain'
          itemToSave={value}
          onPick={(item) => {
            if (item.metadata.type !== 'message-filter-chain') {
              return;
            }

            props.onChange({ type: 'reference', reference: item.metadata.id })
          }}
          isForceShowButtons={isHovered}
        />
        <div style={{ marginBottom: '12rem', display: 'flex', alignItems: 'center', gap: '8rem' }}>
          <Toggle
            label="Enabled"
            value={spec.isEnabled}
            onChange={v => onSpecChange({ ...spec, isEnabled: v })}
            help="The whole filter chain will be disabled if this toggle is off."
          />
          <Toggle
            label="Negated"
            value={spec.isNegated}
            onChange={v => onSpecChange({ ...spec, isNegated: v })}
            help="This filter chain results will be reversed. Filtered messages will be passed and vice versa."
          />
          <Select<'all' | 'any'>
            list={[
              { type: 'item', title: 'All filters should match', value: 'all' },
              { type: 'item', title: 'At least one filter should match', value: 'any' },
            ]}
            value={spec.mode}
            onChange={v => onSpecChange({ ...spec, mode: v })}
          />
        </div>
      </div>

      {spec.filters.length === 0 && (
        <div style={{ marginBottom: '12rem' }}>
          <NothingToShow content={<div>Click the button below to add a first filter.</div>} />
        </div>
      )}

      {spec.filters.length && spec.filters.map((filter) => {
        const filterId = filter.type === 'reference' ? filter.reference : filter.value.metadata.id;
        return (
          <div key={filterId} className={s.Entry}>
            <div className={s.EntryFilter}>
              <FilterEditor
                value={filter}
                onChange={(updatedFilter) => {
                  const newFilters = spec.filters.map((f) => {
                    const fId = f.type === 'reference' ? f.reference : f.value.metadata.id;
                    if (fId === filterId) {
                      return updatedFilter;
                    }
                    return f;
                  });
                  onSpecChange({ ...spec, filters: newFilters });
                }}
                onDelete={() => {
                  const newFilters = spec.filters.filter((f) => {
                    const fId = f.type === 'reference' ? f.reference : f.value.metadata.id;
                    return fId !== filterId;
                  });
                  onSpecChange({ ...spec, filters: newFilters });
                }}
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

            const newChain = spec.filters.concat([{ type: 'value', value: newFilter }]);
            onSpecChange({ ...spec, filters: newChain });
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
