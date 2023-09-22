import React from 'react';
import { v4 as uuid } from 'uuid';
import SmallButton from '../../../../ui/SmallButton/SmallButton';
import Select from '../../../../ui/Select/Select';
import * as t from '../../types';
import FilterEditor from './FilterEditor/FilterEditor';

import s from './FilterChainEditor.module.css';
import LibraryBrowserPanel from '../../../../ui/LibraryBrowser/LibraryBrowserPanel/LibraryBrowserPanel';
import Toggle from '../../../../ui/Toggle/Toggle';

export type FilterChainProps = {
  value: t.MessageFilterChain;
  onChange: (value: t.MessageFilterChain) => void;
};

const FilterChain: React.FC<FilterChainProps> = (props) => {
  return (
    <div className={s.FilterChainEditor}>
      <LibraryBrowserPanel
        itemType='message-filter-chain'
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
        const isDisabled = props.value.disabledFilters.includes(filterId);
        return (
          <div key={filterId} className={s.Entry}>
            <div className={s.EntryFilter}>
              <LibraryBrowserPanel
                itemType='message-filter'
                onPick={(item) => {
                  if (item.descriptor.type !== 'message-filter') {
                    return;
                  }

                  props.onChange({ ...props.value, filters: { ...props.value.filters, [filterId]: item.descriptor.value } })
                }}
              />
              <FilterEditor
                value={filter}
                onChange={(f) => props.onChange({ ...props.value, filters: { ...props.value.filters, [filterId]: f } })}
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
          text="Add filter"
          type='primary'
        />
      </div>
    </div>
  );
}

export default FilterChain;
