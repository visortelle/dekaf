import React, { useEffect } from 'react';
import s from './FilterChain.module.css'
import * as t from './types';
import Filter from './Filter';
import Button from '../../../../ui/Button/Button';
import SmallButton from '../../../../ui/SmallButton/SmallButton';
import deleteIcon from '!!raw-loader!./icons/delete.svg';
import enableIcon from '!!raw-loader!./icons/enable.svg';
import { v4 as uuid } from 'uuid';
import { cloneDeep } from 'lodash';
import Select from '../../../../ui/Select/Select';

export type FilterChainProps = {
  value: t.Chain;
  onChange: (value: t.Chain) => void;
};

const FilterChain: React.FC<FilterChainProps> = (props) => {
  return (
    <div className={s.FilterChain}>
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
      {Object.entries(props.value.filters).map(([entryId, entry], i) => {
        const isDisabled = props.value.disabledFilters.includes(entryId);
        return (
          <div key={entryId} className={s.Entry}>
            <div className={s.EntryFilter}>
              <Filter
                value={entry.filter}
                onChange={(f) => props.onChange({ ...props.value, filters: { ...props.value.filters, [entryId]: { ...entry, filter: f } } })}
              />
            </div>
            <div className={s.EntryButtons}>
              <div className={s.EntryButton}>
                <Button
                  svgIcon={enableIcon}
                  onClick={() => {
                    const newDisabledFilters = props.value.disabledFilters.includes(entryId) ?
                      props.value.disabledFilters.filter(id => id !== entryId) :
                      [...props.value.disabledFilters, entryId];
                    props.onChange({ ...props.value, disabledFilters: newDisabledFilters });
                  }}
                  title={isDisabled ? 'Enable filter' : 'Disable filter'}
                  type={isDisabled ? 'regular' : 'primary'}
                />
              </div>

              <div className={s.EntryButton} style={{ marginTop: 'auto' }}>
                <Button
                  svgIcon={deleteIcon}
                  onClick={() => {
                    const newFilters = cloneDeep(props.value.filters);
                    delete newFilters[entryId];
                    props.onChange({ ...props.value, filters: newFilters });
                  }}
                  type="danger"
                  title="Delete filter"
                />
              </div>
            </div>
          </div>
        );
      })}
      <SmallButton
        onClick={() => {
          const newFilter: t.Filter = { syntax: 'js', value: '' };
          const newChain: t.Chain = { ...props.value, filters: { ...props.value.filters, [uuid()]: { filter: newFilter } } };
          props.onChange(newChain);
        }}
        text="Add filter"
        type='primary'
      />
    </div>
  );
}

export default FilterChain;
