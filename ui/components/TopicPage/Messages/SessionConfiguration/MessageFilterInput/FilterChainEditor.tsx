import React from 'react';
import { v4 as uuid } from 'uuid';

import Button from '../../../../ui/Button/Button';
import SmallButton from '../../../../ui/SmallButton/SmallButton';
import Select from '../../../../ui/Select/Select';
import * as t from './types';
import Filter from './FilterEditor';
import enableIcon from './icons/enable.svg';

import s from './FilterChainEditor.module.css';

const defaultFilter = `({ key, value, accum }) => {
  return true;
}`;

export type FilterChainProps = {
  value: t.MessageFilterChain;
  onChange: (value: t.MessageFilterChain) => void;
};

const FilterChain: React.FC<FilterChainProps> = (props) => {
  return (
    <div className={s.FilterChainEditor}>
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

      {props.value.filters && Object.entries(props.value.filters).map(([filterId, filter], index) => {
        const isDisabled = props.value.disabledFilters.includes(filterId);
        return (
          <div key={filterId} className={s.Entry}>
            <div className={s.EntryFilter}>
              <Filter
                value={filter}
                onChange={(f) => props.onChange({ ...props.value, filters: { ...props.value.filters, [filterId]: f } })}
                autoCompleteConfig={index === 0}
              />
            </div>
            <div className={s.EntryButtons}>
              <div className={s.EntryButton}>
                <Button
                  svgIcon={enableIcon}
                  onClick={() => {
                    const newDisabledFilters = props.value.disabledFilters.includes(filterId) ?
                      props.value.disabledFilters.filter(id => id !== filterId) :
                      [...props.value.disabledFilters, filterId];
                    props.onChange({ ...props.value, disabledFilters: newDisabledFilters });
                  }}
                  title={isDisabled ? 'Enable filter' : 'Disable filter'}
                  type={isDisabled ? 'regular' : 'primary'}
                />
              </div>
            </div>
          </div>
        );
      })}
      <div className={`${s.Buttons}`}>
        <SmallButton
          onClick={() => {
            const newFilter: t.MessageFilter = { value: defaultFilter };
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
