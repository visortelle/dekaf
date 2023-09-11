import React from 'react';
import { v4 as uuid } from 'uuid';

import Button from '../../../../ui/Button/Button';
import SmallButton from '../../../../ui/SmallButton/SmallButton';
import Select from '../../../../ui/Select/Select';
import * as t from './types';
import Filter from './Filter';
import * as Modals from '../../../../app/contexts/Modals/Modals';
import enableIcon from './icons/enable.svg';

import s from './FilterChain.module.css';
import LibraryBrowser from '../../../../ui/LibraryBrowser/LibraryBrowser';

const defaultFilter = `({ key, value, accum }) => {
  return true;
}`;

export type FilterChainProps = {
  value: t.Chain;
  onChange: (value: t.Chain) => void;
};

const FilterChain: React.FC<FilterChainProps> = (props) => {
  const modals = Modals.useContext();

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

      {props.value.filters && Object.entries(props.value.filters).map(([entryId, entry], index) => {
        const isDisabled = props.value.disabledFilters.includes(entryId);
        return (
          <div key={entryId} className={s.Entry}>
            <div className={s.EntryFilter}>
              <Filter
                value={entry.filter}
                onChange={(f) => props.onChange({ ...props.value, filters: { ...props.value.filters, [entryId]: {filter: f}  } })}
                autoCompleteConfig={index === 0}
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
            </div>
          </div>
        );
      })}
      <div className={`${s.Buttons}`}>
        <SmallButton
          onClick={() => {
            const newFilter: t.Filter = { value: defaultFilter };
            const newChain: t.Chain = { ...props.value, filters: { ...props.value.filters, [uuid()]: { filter: newFilter } } };
            props.onChange(newChain);
          }}
          text="Add filter"
          type='primary'
        />
        <SmallButton
          onClick={() => modals.push({
            id: 'filter-editor',
            title: `Library Browser`,
            content:
              <LibraryBrowser />,
            styleMode: 'no-content-padding'
          })}

          text="Browse filters"
          type='primary'
        />
      </div>
    </div>
  );
}

export default FilterChain;
