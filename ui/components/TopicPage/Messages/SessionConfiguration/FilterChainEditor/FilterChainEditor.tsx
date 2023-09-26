import React from 'react';
import { v4 as uuid } from 'uuid';
import SmallButton from '../../../../ui/SmallButton/SmallButton';
import Select from '../../../../ui/Select/Select';
import * as t from '../../types';
import FilterEditor from './FilterEditor/FilterEditor';
import createIcon from './icons/create.svg';

import s from './FilterChainEditor.module.css';
import LibraryBrowserPanel from '../../../../ui/LibraryBrowser/LibraryBrowserPanel/LibraryBrowserPanel';

export type FilterChainProps = {
  value: t.MessageFilterChain;
  onChange: (value: t.MessageFilterChain) => void;
};

const FilterChain: React.FC<FilterChainProps> = (props) => {
  return (
    <div className={s.FilterChainEditor}>
      <LibraryBrowserPanel
        itemType='message-filter-chain'
        itemDescriptorToSave={{ type: 'message-filter-chain', value: props.value }}
        onPick={(item) => {
          if (item.descriptor.type !== 'message-filter-chain') {
            return;
          }

          props.onChange(item.descriptor.value)
        }}
      />
      <div style={{ marginBottom: '12rem' }}>
        <Select<'all' | 'any'>
          list={[
            { type: 'item', title: 'All filters should match', value: 'all' },
            { type: 'item', title: 'At least one filter should match', value: 'any' },
          ]}
          value={props.value.mode}
          onChange={v => props.onChange({ ...props.value, mode: v })}
        />
      </div>

      {props.value.filters && Object.entries(props.value.filters).map(([filterId, filter], _) => {
        return (
          <div key={filterId} className={s.Entry}>
            <div className={s.EntryFilter}>
              <FilterEditor
                value={filter}
                onChange={(f) => props.onChange({ ...props.value, filters: { ...props.value.filters, [filterId]: f } })}
                onDelete={() => {
                  const newFilters = { ...props.value.filters };
                  delete newFilters[filterId];
                  props.onChange({ ...props.value, filters: newFilters });
                }}
              />
            </div>
          </div>
        );
      })}
      <div className={`${s.Buttons}`}>
        <SmallButton
          onClick={() => {
            const newFilter: t.MessageFilter = {
              isEnabled: true,
              isNegated: false,
              type: 'basic-message-filter',
              value: {}
            };
            const newChain: t.MessageFilterChain = { ...props.value, filters: { ...props.value.filters, [uuid()]: newFilter } };
            props.onChange(newChain);
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
